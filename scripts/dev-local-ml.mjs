import {spawn} from 'node:child_process';
// Run after npm run prepare:local-ml. Shell-compatible for Windows and Linux.
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js','--host','0.0.0.0'], {
  stdio:'inherit',
  env:{...process.env,VITE_ENABLE_LOCAL_ML:'true',VITE_ENABLE_LOCAL_RECOGNITION:'false',VITE_ENABLE_LIVE_API:'false',VITE_RECOGNITION_URL:''},
});
child.on('exit',code=>{process.exitCode=code??1;});
