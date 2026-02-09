use serde::Serialize;
use std::fs;
use std::io::{BufRead, BufReader};
use std::time::SystemTime;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub id: String,
    pub project_id: String,
    pub created_at: Option<String>,
    pub updated_at: Option<u64>,
    pub first_message: Option<String>,
    pub git_branch: Option<String>,
    pub cwd: Option<String>,
}

pub fn system_time_to_unix_ms(t: SystemTime) -> Option<u64> {
    t.duration_since(SystemTime::UNIX_EPOCH)
        .ok()
        .map(|d| d.as_millis() as u64)
}

fn truncate(s: &str, max_chars: usize) -> String {
    if s.chars().count() <= max_chars {
        s.to_string()
    } else {
        let truncated: String = s.chars().take(max_chars).collect();
        format!("{}...", truncated)
    }
}

/// Extract text from a JSONL message content field.
/// Content can be a plain string or an array of content blocks.
fn extract_text_from_content(content: &serde_json::Value) -> Option<String> {
    match content {
        serde_json::Value::String(s) => {
            let trimmed = s.trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(truncate(&trimmed, 120))
            }
        }
        serde_json::Value::Array(arr) => {
            for item in arr {
                if item.get("type").and_then(|v| v.as_str()) == Some("text") {
                    if let Some(text) = item.get("text").and_then(|v| v.as_str()) {
                        let trimmed = text.trim().to_string();
                        if !trimmed.is_empty() {
                            return Some(truncate(&trimmed, 120));
                        }
                    }
                }
            }
            None
        }
        _ => None,
    }
}

/// Check if a text starts with command-like XML tags that should be skipped.
fn is_command_content(text: &str) -> bool {
    let trimmed = text.trim_start();
    trimmed.starts_with("<command-message>")
        || trimmed.starts_with("<command-name>")
        || trimmed.starts_with("<local-command-")
}

#[tauri::command]
pub fn list_sessions(project_id: String) -> Result<Vec<SessionInfo>, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    let project_dir = home.join(".claude").join("projects").join(&project_id);

    if !project_dir.exists() {
        return Ok(vec![]);
    }

    let mut sessions: Vec<SessionInfo> = Vec::new();

    let entries = fs::read_dir(&project_dir).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".jsonl") {
            continue;
        }

        let session_id = name.trim_end_matches(".jsonl").to_string();
        let file_path = entry.path();

        // Get file modification time for updated_at
        let updated_at = entry
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(system_time_to_unix_ms);

        // Read JSONL to extract metadata
        let mut created_at: Option<String> = None;
        let mut first_message: Option<String> = None;
        let mut git_branch: Option<String> = None;
        let mut cwd: Option<String> = None;

        if let Ok(file) = fs::File::open(&file_path) {
            let reader = BufReader::new(file);
            let mut bytes_read: usize = 0;
            const MAX_BYTES: usize = 64 * 1024;

            let mut found_cwd = false;
            let mut found_first_message = false;

            for line in reader.lines() {
                let line = match line {
                    Ok(l) => l,
                    Err(_) => continue,
                };

                bytes_read += line.len() + 1;
                if bytes_read > MAX_BYTES {
                    break;
                }

                let parsed: serde_json::Value = match serde_json::from_str(&line) {
                    Ok(v) => v,
                    Err(_) => continue,
                };

                // Only process "user" type entries
                if parsed.get("type").and_then(|v| v.as_str()) != Some("user") {
                    continue;
                }

                let is_root = parsed
                    .get("parentUuid")
                    .map_or(false, |v| v.is_null());

                let is_meta = parsed
                    .get("isMeta")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                // Extract cwd from any user entry (isMeta doesn't matter for cwd)
                if !found_cwd {
                    if let Some(c) = parsed.get("cwd").and_then(|v| v.as_str()) {
                        cwd = Some(c.to_string());
                        found_cwd = true;
                    }
                }

                // Extract created_at from the first user entry with parentUuid: null
                if is_root && created_at.is_none() {
                    if let Some(ts) = parsed.get("timestamp").and_then(|v| v.as_str()) {
                        created_at = Some(ts.to_string());
                    }
                    if git_branch.is_none() {
                        if let Some(branch) = parsed.get("gitBranch").and_then(|v| v.as_str()) {
                            git_branch = Some(branch.to_string());
                        }
                    }
                }

                // Extract firstMessage: root user entry, not meta, not command content
                if is_root && !is_meta && !found_first_message {
                    if let Some(msg) = parsed.get("message") {
                        if let Some(content) = msg.get("content") {
                            if let Some(text) = extract_text_from_content(content) {
                                if !is_command_content(&text) {
                                    first_message = Some(text);
                                    found_first_message = true;
                                }
                            }
                        }
                    }
                }

                // Stop if we have everything
                if found_cwd && found_first_message && created_at.is_some() {
                    break;
                }
            }
        }

        sessions.push(SessionInfo {
            id: session_id,
            project_id: project_id.clone(),
            created_at,
            updated_at,
            first_message,
            git_branch,
            cwd,
        });
    }

    // Sort by updated_at descending
    sessions.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    Ok(sessions)
}
