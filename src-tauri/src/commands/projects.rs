use serde::Serialize;
use std::fs;
use std::process::Command;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfo {
    pub id: String,
    pub path: String,
    pub display_name: String,
    pub host: String,
    pub owner: String,
}

#[tauri::command]
pub fn list_projects() -> Result<Vec<ProjectInfo>, String> {
    let output = Command::new("ghq")
        .arg("root")
        .output()
        .map_err(|e| format!("ghq root の実行に失敗しました。ghq がインストールされているか確認してください: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ghq root がエラーを返しました: {stderr}"));
    }

    let ghq_root = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if ghq_root.is_empty() {
        return Err("ghq root が空のパスを返しました".to_string());
    }

    let root_path = std::path::Path::new(&ghq_root);
    if !root_path.is_dir() {
        return Ok(vec![]);
    }

    let mut projects: Vec<ProjectInfo> = Vec::new();

    // Scan 3 levels: {host}/{owner}/{repo}
    let hosts = match fs::read_dir(root_path) {
        Ok(entries) => entries,
        Err(_) => return Ok(vec![]),
    };

    for host_entry in hosts.flatten() {
        if !host_entry.file_type().map_or(false, |ft| ft.is_dir()) {
            continue;
        }
        let host = host_entry.file_name().to_string_lossy().to_string();

        let owners = match fs::read_dir(host_entry.path()) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for owner_entry in owners.flatten() {
            if !owner_entry.file_type().map_or(false, |ft| ft.is_dir()) {
                continue;
            }
            let owner = owner_entry.file_name().to_string_lossy().to_string();

            let repos = match fs::read_dir(owner_entry.path()) {
                Ok(entries) => entries,
                Err(_) => continue,
            };

            for repo_entry in repos.flatten() {
                if !repo_entry.file_type().map_or(false, |ft| ft.is_dir()) {
                    continue;
                }

                let repo_path = repo_entry.path();
                if !repo_path.join(".git").exists() {
                    continue;
                }

                let repo_name = repo_entry.file_name().to_string_lossy().to_string();
                let id = format!("{host}/{owner}/{repo_name}");
                let path = repo_path.to_string_lossy().to_string();

                projects.push(ProjectInfo {
                    id,
                    path,
                    display_name: repo_name,
                    host: host.clone(),
                    owner: owner.clone(),
                });
            }
        }
    }

    // Sort alphabetically by id
    projects.sort_by(|a, b| a.id.cmp(&b.id));

    Ok(projects)
}
