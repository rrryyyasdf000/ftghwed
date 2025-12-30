// 测试注册功能（使用原生 fetch API）
async function testRegister() {
    try {
        console.log('正在测试注册功能...');
        
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'testuser',
                email: 'test@example.com',
                password: 'testpass123'
            })
        });
        
        const data = await response.json();
        console.log('注册响应:', data);
        
        if (response.ok) {
            console.log('注册成功!');
        } else {
            console.log('注册失败:', data.message);
        }
    } catch (error) {
        console.log('网络错误:', error.message);
    }
}

// 测试登录功能
async function testLogin() {
    try {
        console.log('正在测试登录功能...');
        
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'testuser',
                password: 'testpass123'
            })
        });
        
        const data = await response.json();
        console.log('登录响应:', data);
        
        if (response.ok) {
            console.log('登录成功!');
        } else {
            console.log('登录失败:', data.message);
        }
    } catch (error) {
        console.log('网络错误:', error.message);
    }
}

// 运行测试
testRegister().then(() => testLogin());