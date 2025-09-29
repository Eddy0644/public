#!/bin/bash
LOG_FILE="/var/log/scheduled_backup.log"
BASE_PATH="/mnt/Backups/live"

log() {
    local msg="$(date '+%Y-%m-%d %H:%M:%S') - $1"
    echo "$msg" | tee -a "$LOG_FILE"
}

# Common rsync execution and output handling
execute_rsync() {
    local cmd="$1"
    local success_msg="$2"
    local error_msg="$3"
    
    # Capture rsync output
    local rsync_output
    rsync_output=$(eval "$cmd" 2>&1)
    local exit_code=$?
    
    # Save full output to log
    echo "$rsync_output" >> "$LOG_FILE"
    
    # Extract and display summary line if found
    local summary_line=$(echo "$rsync_output" | grep -E "sent.*bytes.*received.*bytes.*bytes/sec")
    
    if [ $exit_code -eq 0 ]; then
        [ -n "$summary_line" ] && echo "${4:+[$4] }$summary_line" || echo "$rsync_output"
    else
        # Show errors to console
        echo "$rsync_output" | grep -E "(error|ERROR|failed|Failed)" >&2
        log "$error_msg (退出码: $exit_code)"
        return 1
    fi
}

remoteToLocal() {
    [ $# -lt 3 ] && { log "错误: 用法: remoteToLocal <主机> <远程路径> <本地路径> [选项]"; return 1; }
    local ssh_host="$1" remote_path="$2" local_path="$3" extra_options="$4"
    
    # Handle relative/absolute paths
    [[ "$local_path" != /* ]] && local_path="$BASE_PATH/$local_path"
    
    log "开始同步: $ssh_host:$remote_path -> $local_path"
    [ ! -d "$local_path" ] && mkdir -p "$local_path" && log "创建目录: $local_path"
    
    local cmd="rsync -avz --delete --stats -e ssh ${extra_options:+$extra_options }'$ssh_host:$remote_path' '$local_path'"
    log "执行: $cmd"
    
    execute_rsync "$cmd" "" "错误: 同步失败: $ssh_host:$remote_path"
    log "----------------------------------------"
}

localToRemote() {
    [ $# -lt 3 ] && { log "错误: 用法: localToRemote <本地路径> <主机> <远程路径> [选项]"; return 1; }
    local local_path="$1" ssh_host="$2" remote_path="$3" extra_options="$4"
    
    # Handle relative/absolute paths
    [[ "$local_path" != /* ]] && local_path="$BASE_PATH/$local_path"
    
    [ ! -d "$local_path" ] && { log "错误: 本地目录不存在: $local_path"; return 1; }
    
    log "开始同步: $local_path -> $ssh_host:$remote_path"
    local cmd="rsync -avz --delete --stats -e ssh ${extra_options:+$extra_options }'$local_path' '$ssh_host:$remote_path'"
    log "执行: $cmd"
    
    execute_rsync "$cmd" "" "错误: 同步失败: $local_path -> $ssh_host:$remote_path"
    log "----------------------------------------"
}

localToLocal() {
    [ $# -lt 2 ] && { log "错误: 用法: localToLocal <源路径> <目标路径> [选项]"; return 1; }
    local source_path="$1" target_path="$2" extra_options="$3"
    
    # Handle relative/absolute paths for target
    [[ "$target_path" != /* ]] && target_path="$BASE_PATH/$target_path"
    
    [ ! -e "$source_path" ] && { log "错误: 源路径不存在: $source_path"; return 1; }
    
    log "开始本地同步: $source_path -> $target_path"
    
    # Create target directory if needed
    local target_dir=$([[ -d "$source_path" ]] && echo "$target_path" || dirname "$target_path")
    [ ! -d "$target_dir" ] && mkdir -p "$target_dir" && log "创建目录: $target_dir"
    
    local cmd="rsync -av --stats ${extra_options:+$extra_options }'$source_path' '$target_path'"
    log "执行: $cmd"
    
    execute_rsync "$cmd" "" "错误: 本地同步失败: $source_path -> $target_path"
    log "----------------------------------------"
}

unison() {
    [ -z "$1" ] && { log "错误: 用法: unison <配置名>"; return 1; }
    
    log "开始双向同步: $1 (使用用户: ryan)"
    # Run unison in ryan's home directory to avoid permission issues
    if sudo -u ryan -H bash -c "cd ~ && unison '$1' -batch -terse" 2>&1 | tee -a "$LOG_FILE"; then
        log "双向同步成功: $1"
    else
        log "错误: 双向同步失败: $1 (退出码: $?)"
    fi
    log "----------------------------------------"
}

# Backup Caddyfiles from multiple hosts
caddyfile_backup() {
    local backup_dir="$BASE_PATH/Caddyfile"
    [ ! -d "$backup_dir" ] && mkdir -p "$backup_dir" && log "创建目录: $backup_dir"
    
    for host in "$@"; do
        log "备份 $host 的Caddyfile"
        local cmd="rsync -avz -e ssh '$host:/root/niv/Caddyfile' '$backup_dir/${host}_Caddyfile'"
        execute_rsync "$cmd" "" "错误: 备份失败: $host" "$host"
    done
    log "----------------------------------------"
}

localToMultipleRemote() {
    [ $# -lt 3 ] && { log "错误: 用法: localToMultipleRemote <源文件> <目标路径> <主机1> [主机2] ..."; return 1; }
    local source_file="$1" target_path="$2"
    shift 2
    
    [ ! -f "$source_file" ] && { log "错误: 源文件不存在: $source_file"; return 1; }
    
    log "开始分发文件: $source_file -> $target_path 到 $# 个主机"
    
    for host in "$@"; do
        log "分发到 $host:$target_path"
        local cmd="rsync -avz -e ssh '$source_file' '$host:$target_path'"
        execute_rsync "$cmd" "" "错误: 分发失败: $host" "$host"
    done
    log "----------------------------------------"
}

# Add 10 blank lines to log for easier navigation
for i in {1..10}; do echo "" >> "$LOG_FILE"; done

# Check if script is called with arguments
if [ $# -gt 0 ]; then
    # Execute function with provided arguments
    "$@"
else

# =============================================================================
# Execute backup tasks
# =============================================================================


# EXAMPLE    
remoteToLocal "srv" "/etc/wireguard" "srv-wg/"



fi


# =============================================================================
# CRONTAB Configuration
# =============================================================================
# Execute every 3 days at 2 AM:
# 0 2 */3 * * /usr/local/bin/cron_backuper

# =============================================================================
# Usage Examples
# =============================================================================
# Basic backup:
# remoteToLocal "host" "/remote/path/" "local/path/"         # Relative path (under /mnt/Backups/live/)
# remoteToLocal "host" "/remote/path/" "/absolute/path/"     # Absolute path
# localToRemote "local/path/" "host" "/remote/path/"         # Relative path (under /mnt/Backups/live/)
# localToRemote "/absolute/path/" "host" "/remote/path/"     # Absolute path
# localToLocal "/source/path/" "target/path/"                # Target relative path (under /mnt/Backups/live/)
# localToLocal "/source/path/" "/absolute/target/path/"      # Target absolute path
# unison "config_name"
# caddyfile_backup host1 host2 host3
# localToMultipleRemote "/source/file" "/target/path/" host1 host2 host3

# Execute specific function with arguments:
# cron_backuper localToLocal /etc/nginx/ nginx-backup/

# Backup with exclude options:
# remoteToLocal "host" "/remote/path/" "local/path/" "--exclude=cache/ --exclude=*.tmp"

# Backup with include options:
# remoteToLocal "host" "/remote/path/" "local/path/" "--include=*.conf --exclude=*"

# Other common options:
# --exclude=pattern     # Exclude files/directories matching pattern
# --include=pattern     # Include files/directories matching pattern
# --max-size=SIZE       # Exclude files larger than SIZE
# --min-size=SIZE       # Exclude files smaller than SIZE
# --dry-run            # Test run without actual file transfer
