use crate::pty::{self, PtyState};
use portable_pty::PtySize;
use std::io::Write;

#[tauri::command]
pub fn spawn_pty(
    cwd: Option<String>,
    session_id: Option<String>,
    cols: u16,
    rows: u16,
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, PtyState>,
) -> Result<String, String> {
    pty::spawn(&state, app_handle, session_id.as_deref(), cwd.as_deref(), cols, rows)
}

#[tauri::command]
pub fn write_pty(id: String, data: Vec<u8>, state: tauri::State<'_, PtyState>) -> Result<(), String> {
    let mut instances = state.instances.lock().unwrap();
    let instance = instances
        .get_mut(&id)
        .ok_or_else(|| format!("PTY not found: {id}"))?;
    instance
        .writer
        .write_all(&data)
        .map_err(|e| format!("Write failed: {e}"))?;
    instance
        .writer
        .flush()
        .map_err(|e| format!("Flush failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn resize_pty(
    id: String,
    cols: u16,
    rows: u16,
    state: tauri::State<'_, PtyState>,
) -> Result<(), String> {
    let mut instances = state.instances.lock().unwrap();
    let instance = instances
        .get_mut(&id)
        .ok_or_else(|| format!("PTY not found: {id}"))?;
    instance
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Resize failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn kill_pty(id: String, state: tauri::State<'_, PtyState>) -> Result<(), String> {
    pty::kill(&state, &id)
}
