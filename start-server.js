const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 检查 MongoDB 是否正在运行
function checkMongoDB() {
    return new Promise((resolve) => {
        const mongoProcess = spawn('mongod', ['--version']);
        
        let checked = false;
        mongoProcess.on('error', () => {
            console.log('MongoDB 未安装或未在 PATH 中，请先安装 MongoDB Community Edition');
            resolve(false);
        });
        
        mongoProcess.on('exit', (code) => {
            if (!checked) {
                checked = true;
                if (code === 0) {
                    console.log('MongoDB 客户端可用');
                    resolve(true);
                } else {
                    console.log('MongoDB 未运行或配置不正确');
                    resolve(false);
                }
            }
        });
        
        setTimeout(() => {
            if (!checked) {
                checked = true;
                console.log('MongoDB 检查超时');
                resolve(false);
            }
        }, 5000);
    });
}

// 检查依赖是否已安装
function checkDependencies() {
    return fs.existsSync('node_modules');
}

// 安装依赖
function installDependencies() {
    return new Promise((resolve, reject) => {
        console.log('正在安装依赖...');
        const npmInstall = spawn('npm', ['install'], { cwd: process.cwd() });
        
        npmInstall.stdout.on('data', (data) => {
            console.log(`npm install 输出: ${data}`);
        });
        
        npmInstall.stderr.on('data', (data) => {
            console.error(`npm install 错误: ${data}`);
        });
        
        npmInstall.on('close', (code) => {
            if (code === 0) {
                console.log('依赖安装完成');
                resolve();
            } else {
                reject(new Error(`npm install 失败，退出码: ${code}`));
            }
        });
    });
}

// 启动服务器
function startServer() {
    console.log('正在启动服务器...');
    const server = spawn('node', ['server.js'], { cwd: process.cwd() });
    
    server.stdout.on('data', (data) => {
        console.log(`服务器输出: ${data}`);
    });
    
    server.stderr.on('data', (data) => {
        console.error(`服务器错误: ${data}`);
    });
    
    server.on('error', (err) => {
        console.error('无法启动服务器:', err.message);
    });
    
    // 监听服务器进程退出
    server.on('close', (code) => {
        console.log(`服务器进程退出，退出码: ${code}`);
    });
}

// 主函数
async function main() {
    try {
        // 检查 MongoDB
        const isMongoAvailable = await checkMongoDB();
        if (!isMongoAvailable) {
            console.log('警告: MongoDB 可能未运行。请确保 MongoDB 服务正在运行。');
            console.log('在 Windows 上，您可以通过以下方式启动 MongoDB:');
            console.log('1. 打开命令提示符（以管理员身份运行）');
            console.log('2. 运行: net start MongoDB');
            console.log('或确保 MongoDB 运行在默认端口 27017 上');
        }
        
        // 检查依赖
        if (!checkDependencies()) {
            await installDependencies();
        } else {
            console.log('依赖已存在');
        }
        
        // 启动服务器
        startServer();
        
    } catch (error) {
        console.error('启动过程中出现错误:', error.message);
    }
}

main();