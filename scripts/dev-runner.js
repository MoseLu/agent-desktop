const { spawn } = require('child_process');
const path = require('path');

// Function to kill existing processes on port 5173 (Windows)
function killPortProcesses(port) {
  const { exec } = require('child_process');
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (!stdout) {
        resolve(); // No processes found on this port
        return;
      }

      const lines = stdout.trim().split('\r\n');
      const pids = [];
      
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[4];
          if (pid && !pids.includes(pid)) {
            pids.push(pid);
          }
        }
      });

      if (pids.length > 0) {
        console.log(`Terminating processes on port ${port}: ${pids.join(', ')}`);
        pids.forEach(pid => {
          exec(`taskkill /F /PID ${pid}`, () => {}); // Ignore errors
        });
      }
      setTimeout(resolve, 1000); // Wait a bit for processes to terminate
    });
  });
}

async function startDevEnvironment() {
  console.log('Checking for existing processes on port 5173...');
  await killPortProcesses(5173);

  console.log('Starting Vite server...');
  const vite = spawn('npx', ['vite'], { 
    stdio: 'inherit', 
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  vite.on('error', (err) => {
    console.error('Error starting Vite:', err);
    process.exit(1);
  });

  vite.on('close', (code) => {
    console.log(`Vite exited with code ${code}`);
    // Don't exit the process here as we might want to restart or handle gracefully
  });

  // Wait a bit for the server to start
  setTimeout(async () => {
    console.log('Waiting for Vite server to be ready...');
    
    // Wait for Vite server to be ready
    const waitOn = spawn('npx', ['wait-on', 'http://localhost:5173'], { shell: true });
    
    waitOn.on('close', (code) => {
      if (code === 0) {
        console.log('Vite server is ready. Starting Electron app...');
        
        // Start Electron app after Vite is ready
        const electron = spawn('npx', ['electron', '.'], { 
          stdio: 'inherit',
          shell: true,
          cwd: path.resolve(__dirname, '..'),
          env: { ...process.env, ELECTRON_START_URL: 'http://localhost:5173' }
        });
        
        electron.on('error', (err) => {
          console.error('Error starting Electron:', err);
        });

        electron.on('close', (code) => {
          console.log(`Electron exited with code ${code}`);
          process.exit(code || 0);
        });
      } else {
        console.error('Failed to wait for Vite server');
        process.exit(1);
      }
    });
    
    waitOn.on('error', (err) => {
      console.error('Error running wait-on:', err);
      process.exit(1);
    });
  }, 3000); // Wait 3 seconds before checking if server is ready
}

startDevEnvironment();