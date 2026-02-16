### Port Already in Use

Another application is using ports 80, 8090, or 5572.

**Solution:**
1. Find what's using the port:
   ```powershell
   netstat -ano | findstr :80
   ```
2. Either stop that application or modify the ports in `docker-compose.windows.yml`# Omni.Thooft - Windows Deployment Guide

Simplified deployment for Windows 11 - just one command!

## Prerequisites

- **Docker Desktop for Windows** installed and running

## Quick Start (Recommended)

### Deploy in One Command

```powershell
docker compose -f docker-compose.windows.yml up -d
```

That's it! The stack will:
- Automatically create all necessary volumes
- Copy migration and hook files
- Start all services
- Use default credentials (change them after first login)

**Default credentials:**
- Email: `admin@example.com`
- Password: `changeme`

### Deploy with Custom Credentials

1. Create a `stack.env` file:
   ```env
   ADMIN_EMAIL=your-email@example.com
   ADMIN_PASSWORD=YourSecurePassword123!
   ```

2. Deploy:
   ```powershell
   docker compose -f docker-compose.windows.yml --env-file stack.env up -d
   ```

## Advanced Setup (Optional)

If you prefer the scripted setup with custom directory locations:

1. **Open PowerShell** in the project directory
2. **Run the setup script:**
   ```powershell
   .\setup-windows.ps1
   ```
3. **Follow the prompts** to configure your environment
4. **Edit `stack.env`** with your credentials
5. **Deploy the stack:**
   ```powershell
   docker compose -f docker-compose.windows.yml --env-file stack.env up -d
   ```

## Where Is My Data?

All data is stored in Docker volumes. To see them:

```powershell
docker volume ls | Select-String "omni_thooft"
```

You'll see:
- `omni_thooft_pb_data` - Your database and user data
- `omni_thooft_pb_migrations` - Database migration files
- `omni_thooft_pb_hooks` - Custom hooks
- `omni_thooft_rclone_config` - RClone configuration
- `omni_thooft_backups` - Backup files

### Backup Your Data

```powershell
# Backup to a tar file
docker run --rm -v omni_thooft_pb_data:/data -v ${PWD}:/backup alpine tar czf /backup/omni-backup.tar.gz -C /data .
```

### Restore Your Data

```powershell
# Restore from a tar file
docker run --rm -v omni_thooft_pb_data:/data -v ${PWD}:/backup alpine tar xzf /backup/omni-backup.tar.gz -C /data
```

## Alternative: Advanced Setup with Custom Locations

If you want data stored in a specific folder instead of Docker volumes:

#### Step 1: Create Directory Structure

Open PowerShell and run:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\Documents\Docker\pb_data"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\Documents\Docker\pb_migrations"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\Documents\Docker\pb_hooks"
```

#### Step 2: Copy Migration and Hook Files

```powershell
Copy-Item -Path ".\pb_migrations\*" -Destination "$env:USERPROFILE\Documents\Docker\pb_migrations\" -Recurse -Force
Copy-Item -Path ".\pb_hooks\*" -Destination "$env:USERPROFILE\Documents\Docker\pb_hooks\" -Recurse -Force
```

#### Step 3: Set Environment Variable

**For current session only:**
```powershell
$env:OMNI_DOCS_PATH = "C:/Users/$env:USERNAME/Documents/Docker"
```

**To make it permanent:**
```powershell
[System.Environment]::SetEnvironmentVariable('OMNI_DOCS_PATH', "C:/Users/$env:USERNAME/Documents/Docker", 'User')
```

> **Note:** If you set it permanently, restart your terminal and Docker Desktop for changes to take effect.

#### Step 4: Configure Credentials

Create a `stack.env` file from the example:

```powershell
Copy-Item stack.env.example stack.env
```

Edit `stack.env` with your credentials:

```env
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=YourSecurePassword123!

# Google Drive (optional)
GDRIVE_CLIENT_ID=
GDRIVE_CLIENT_SECRET=
```

#### Step 5: Deploy the Stack

```powershell
docker compose -f docker-compose.windows.yml --env-file stack.env up -d
```

## Managing the Stack

### View Running Containers
```powershell
docker ps
```

### View Logs
```powershell
# All services
docker compose -f docker-compose.windows.yml logs -f

# Specific service
docker compose -f docker-compose.windows.yml logs -f app
docker compose -f docker-compose.windows.yml logs -f db
```

### Stop the Stack
```powershell
docker compose -f docker-compose.windows.yml down
```

### Stop and Remove All Data
```powershell
docker compose -f docker-compose.windows.yml down -v
```

### Restart a Service
```powershell
docker compose -f docker-compose.windows.yml restart app
```

### Update to Latest Version
```powershell
docker compose -f docker-compose.windows.yml pull
docker compose -f docker-compose.windows.yml up -d
```

## Accessing the Application

Once deployed:

- **Main Application:** http://localhost
- **PocketBase Admin:** http://localhost:8090/_/
- **RClone API:** http://localhost:5572

## Troubleshooting

### Error: "Access Denied" (Toegang geweigerd)

**This error is now fixed!** The new version uses Docker volumes instead of host paths.

If you still see this error:
1. Make sure you're using the latest `docker-compose.windows.yml`
2. Remove old containers: `docker compose -f docker-compose.windows.yml down`
3. Deploy again: `docker compose -f docker-compose.windows.yml up -d`

### Docker Desktop Not Running

**Solution:**
Start Docker Desktop and wait for it to be fully running before deploying.

### Changes Not Taking Effect

After modifying `stack.env` or the compose file:

```powershell
docker compose -f docker-compose.windows.yml down
docker compose -f docker-compose.windows.yml up -d
```

## Data Persistence

Your data is stored in Docker volumes:

```
omni_thooft_pb_data         # Database and user data  
omni_thooft_pb_migrations   # Database migrations
omni_thooft_pb_hooks        # Custom hooks
omni_thooft_rclone_config   # RClone configuration
omni_thooft_backups         # Backup files
```

**Backup:** See the backup commands in the "Where Is My Data?" section above.

**Restore:** Use the restore command to recover from a backup.

## Uninstalling

1. **Stop and remove the stack:**
   ```powershell
   docker compose -f docker-compose.windows.yml down
   ```

2. **Remove all data volumes (optional):**
   ```powershell
   docker volume rm omni_thooft_pb_data omni_thooft_pb_migrations omni_thooft_pb_hooks omni_thooft_rclone_config omni_thooft_backups
   ```

## Support

For issues or questions:
- Check the main [walkthrough.md](./walkthrough.md) for general documentation
- Review Docker Desktop logs
- Check container logs using `docker compose logs`
