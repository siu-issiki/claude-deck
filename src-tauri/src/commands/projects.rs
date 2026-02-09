use serde::Serialize;
use std::fs;
use std::io::{BufRead, BufReader};

use super::sessions::system_time_to_unix_ms;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfo {
    pub id: String,
    pub path: String,
    pub display_name: String,
    pub session_count: usize,
    pub last_activity: Option<u64>,
}

/// Extract `cwd` from a JSONL file by finding the first `type: "user"` entry.
/// Reads up to 64KB of the file.
fn extract_cwd_from_jsonl(file_path: &std::path::Path) -> Option<String> {
    let file = fs::File::open(file_path).ok()?;
    let reader = BufReader::new(file);
    let mut bytes_read: usize = 0;
    const MAX_BYTES: usize = 64 * 1024;

    for line in reader.lines() {
        let line = line.ok()?;
        bytes_read += line.len() + 1; // +1 for newline
        if bytes_read > MAX_BYTES {
            break;
        }

        let parsed: serde_json::Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(_) => continue,
        };

        if parsed.get("type").and_then(|v| v.as_str()) == Some("user") {
            if let Some(cwd) = parsed.get("cwd").and_then(|v| v.as_str()) {
                return Some(cwd.to_string());
            }
        }
    }

    None
}

#[tauri::command]
pub fn list_projects() -> Result<Vec<ProjectInfo>, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    let projects_dir = home.join(".claude").join("projects");

    if !projects_dir.exists() {
        return Ok(vec![]);
    }

    let mut projects: Vec<ProjectInfo> = Vec::new();

    let entries = fs::read_dir(&projects_dir).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if !metadata.is_dir() {
            continue;
        }

        let dir_name = entry.file_name().to_string_lossy().to_string();

        // Collect .jsonl files with their mtime
        let mut jsonl_files: Vec<(std::path::PathBuf, Option<u64>)> = Vec::new();
        let mut latest_mtime: Option<u64> = None;

        if let Ok(session_entries) = fs::read_dir(entry.path()) {
            for session_entry in session_entries.flatten() {
                let name = session_entry.file_name().to_string_lossy().to_string();
                if name.ends_with(".jsonl") {
                    let mtime = session_entry
                        .metadata()
                        .ok()
                        .and_then(|m| m.modified().ok())
                        .and_then(system_time_to_unix_ms);

                    if let Some(mt) = mtime {
                        latest_mtime = Some(match latest_mtime {
                            Some(prev) => prev.max(mt),
                            None => mt,
                        });
                    }

                    jsonl_files.push((session_entry.path(), mtime));
                }
            }
        }

        let session_count = jsonl_files.len();
        if session_count == 0 {
            continue;
        }

        // Sort by mtime descending to try newest files first for cwd extraction
        jsonl_files.sort_by(|a, b| b.1.cmp(&a.1));

        // Extract cwd from JSONL files
        let mut cwd: Option<String> = None;
        for (path, _) in &jsonl_files {
            if let Some(found_cwd) = extract_cwd_from_jsonl(path) {
                cwd = Some(found_cwd);
                break;
            }
        }

        let (path, display_name) = match &cwd {
            Some(p) => {
                let name = p
                    .rsplit('/')
                    .next()
                    .unwrap_or(p)
                    .to_string();
                (p.clone(), name)
            }
            None => {
                let fallback_name = dir_name.trim_start_matches('-').to_string();
                (String::new(), fallback_name)
            }
        };

        projects.push(ProjectInfo {
            id: dir_name,
            path,
            display_name,
            session_count,
            last_activity: latest_mtime,
        });
    }

    // Sort by last_activity descending
    projects.sort_by(|a, b| b.last_activity.cmp(&a.last_activity));

    Ok(projects)
}
