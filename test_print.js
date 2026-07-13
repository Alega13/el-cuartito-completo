const { exec } = require('child_process');
const fs = require('fs');

const brotherQlExe = `"C:\\Users\\Bootleggers Amager\\AppData\\Local\\Python\\pythoncore-3.14-64\\Scripts\\brother_ql.exe"`;
const tmpPath = "test.png";

const libusbDir = `C:\\Users\\Bootleggers Amager\\AppData\\Local\\Python\\pythoncore-3.14-64\\Lib\\site-packages\\usb1`;
const execEnv = { ...process.env, PATH: `${libusbDir};${process.env.PATH || ''}` };

const cmd = `${brotherQlExe} -b pyusb -m QL-570 -p usb://0x04f9:0x2028 print -l 62 -r 0 "${tmpPath}"`;

exec(cmd, { env: execEnv }, (error, stdout, stderr) => {
    if (error) {
        console.error("ERROR:", error.message);
        console.error("STDERR:", stderr);
    } else {
        console.log("SUCCESS:", stdout);
    }
});
