use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::mpsc;
use std::sync::Mutex;
use std::thread::JoinHandle;
use tauri::Emitter;

pub struct PtyInstance {
    pub master: Box<dyn MasterPty + Send>,
    pub write_tx: mpsc::Sender<Vec<u8>>,
    child: Box<dyn Child + Send + Sync>,
    reader_thread: Option<JoinHandle<()>>,
    writer_thread: Option<JoinHandle<()>>,
}

pub struct PtyState {
    pub instances: Mutex<HashMap<String, PtyInstance>>,
}

impl PtyState {
    pub fn new() -> Self {
        Self {
            instances: Mutex::new(HashMap::new()),
        }
    }
}

pub fn spawn(
    state: &PtyState,
    app_handle: tauri::AppHandle,
    cwd: Option<&str>,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let id = uuid::Uuid::new_v4().to_string();

    let pty_system = native_pty_system();
    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("Failed to open PTY: {e}"))?;

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let mut cmd = CommandBuilder::new(&shell);
    cmd.arg("-l");
    cmd.env("TERM", "xterm-256color");

    match cwd {
        Some(dir) => cmd.cwd(dir),
        None => {
            if let Some(home) = dirs::home_dir() {
                cmd.cwd(home);
            }
        }
    }

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn command: {e}"))?;

    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {e}"))?;

    let event_id = id.clone();
    let reader_thread = std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let encoded = STANDARD.encode(&buf[..n]);
                    let _ = app_handle.emit(&format!("pty:{event_id}:data"), encoded);
                }
                Err(_) => break,
            }
        }
        let _ = app_handle.emit(&format!("pty:{event_id}:exit"), ());
    });

    let mut writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take writer: {e}"))?;

    let (write_tx, write_rx) = mpsc::channel::<Vec<u8>>();
    let writer_thread = std::thread::spawn(move || {
        while let Ok(data) = write_rx.recv() {
            if writer.write_all(&data).is_err() {
                break;
            }
            // Drain any additional buffered data before flushing
            while let Ok(more) = write_rx.try_recv() {
                if writer.write_all(&more).is_err() {
                    return;
                }
            }
            let _ = writer.flush();
        }
    });

    let instance = PtyInstance {
        master: pair.master,
        write_tx,
        child,
        reader_thread: Some(reader_thread),
        writer_thread: Some(writer_thread),
    };

    state
        .instances
        .lock()
        .unwrap()
        .insert(id.clone(), instance);

    Ok(id)
}

pub fn kill(state: &PtyState, id: &str) -> Result<(), String> {
    let mut instance = state
        .instances
        .lock()
        .unwrap()
        .remove(id)
        .ok_or_else(|| format!("PTY not found: {id}"))?;

    let _ = instance.child.kill();
    drop(instance.write_tx);
    drop(instance.master);

    if let Some(thread) = instance.writer_thread.take() {
        let _ = thread.join();
    }
    if let Some(thread) = instance.reader_thread.take() {
        let _ = thread.join();
    }

    Ok(())
}

pub fn kill_all(state: &PtyState) {
    let mut instances = state.instances.lock().unwrap();
    for (_, mut instance) in instances.drain() {
        let _ = instance.child.kill();
        drop(instance.write_tx);
        drop(instance.master);
        if let Some(thread) = instance.writer_thread.take() {
            let _ = thread.join();
        }
        if let Some(thread) = instance.reader_thread.take() {
            let _ = thread.join();
        }
    }
}
