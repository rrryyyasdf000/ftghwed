const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 数据库连接
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quizsystem', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000 // 5秒超时
        });
        console.log('MongoDB 连接成功');
    } catch (error) {
        console.error('MongoDB 连接失败:', error);
        console.log('请确保 MongoDB 服务正在运行');
        // 重试连接
        setTimeout(connectDB, 5000);
    }
};

connectDB();

// 用户模型
const User = require('./models/User');
const Question = require('./models/Question');
const Result = require('./models/Result');

// JWT 验证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '访问被拒绝' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secretkey', (err, user) => {
        if (err) {
            return res.status(403).json({ message: '无效的令牌' });
        }
        req.user = user;
        next();
    });
};

// 注册路由
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 检查请求体是否完整
        if (!username || !email || !password) {
            return res.status(400).json({ message: '请提供用户名、邮箱和密码' });
        }

        // 检查用户是否已存在
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(400).json({ message: '用户名或邮箱已存在' });
        }

        // 密码加密
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建新用户
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({ message: '用户注册成功' });
    } catch (error) {
        console.error('注册错误:', error);
        if (error.name === 'ValidationError') {
            // 处理验证错误
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: '验证失败: ' + errors.join(', ') });
        }
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 登录路由
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 检查请求体是否完整
        if (!username || !password) {
            return res.status(400).json({ message: '请提供用户名和密码' });
        }

        // 查找用户
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        // 验证密码
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        // 生成 JWT 令牌
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: { id: user._id, username: user.username }
        });
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取用户信息
app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取随机题目
app.get('/api/questions/random', authenticateToken, async (req, res) => {
    try {
        const questions = await Question.aggregate([{ $sample: { size: 10 } }]);
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: '获取题目失败' });
    }
});

// 获取所有题目（管理用）
app.get('/api/questions', authenticateToken, async (req, res) => {
    try {
        const questions = await Question.find();
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: '获取题目失败' });
    }
});

// 提交答题
app.post('/api/quiz/submit', authenticateToken, async (req, res) => {
    try {
        const { answers } = req.body;

        // 验证答案
        let correctCount = 0;
        const questionIds = answers.map(a => a.questionId);

        const questions = await Question.find({ _id: { $in: questionIds } });

        answers.forEach(answer => {
            const question = questions.find(q => q._id.toString() === answer.questionId);
            if (question && question.correctAnswer === answer.answer) {
                correctCount++;
            }
        });

        // 保存结果
        const result = new Result({
            userId: req.user.id,
            score: correctCount,
            total: answers.length,
            percentage: Math.round((correctCount / answers.length) * 100),
            answers: answers
        });

        await result.save();

        res.json({
            score: correctCount,
            total: answers.length,
            percentage: Math.round((correctCount / answers.length) * 100)
        });
    } catch (error) {
        res.status(500).json({ message: '提交失败' });
    }
});

// 获取用户成绩
app.get('/api/results', authenticateToken, async (req, res) => {
    try {
        const results = await Result.find({ userId: req.user.id }).sort({ timestamp: -1 });
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: '获取成绩失败' });
    }
});

// 添加题目
app.post('/api/questions', authenticateToken, async (req, res) => {
    try {
        const { question, optionA, optionB, optionC, optionD, correctAnswer } = req.body;

        const newQuestion = new Question({
            question,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer
        });

        await newQuestion.save();
        res.status(201).json(newQuestion);
    } catch (error) {
        res.status(500).json({ message: '添加题目失败' });
    }
});

// 更新题目
app.put('/api/questions/:id', authenticateToken, async (req, res) => {
    try {
        const { question, optionA, optionB, optionC, optionD, correctAnswer } = req.body;

        const updatedQuestion = await Question.findByIdAndUpdate(
            req.params.id,
            { question, optionA, optionB, optionC, optionD, correctAnswer },
            { new: true }
        );

        if (!updatedQuestion) {
            return res.status(404).json({ message: '题目未找到' });
        }

        res.json(updatedQuestion);
    } catch (error) {
        res.status(500).json({ message: '更新题目失败' });
    }
});

// 删除题目
app.delete('/api/questions/:id', authenticateToken, async (req, res) => {
    try {
        const deletedQuestion = await Question.findByIdAndDelete(req.params.id);

        if (!deletedQuestion) {
            return res.status(404).json({ message: '题目未找到' });
        }

        res.json({ message: '题目删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除题目失败' });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});

// 处理服务器错误
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`端口 ${PORT} 已被占用，请使用其他端口`);
    } else {
        console.error('服务器启动错误:', error);
    }
});