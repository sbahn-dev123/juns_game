const jwt = require('jsonwebtoken');

function admin(req, res, next) {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: '인증 토큰이 없어 접근이 거부되었습니다.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: '접근 권한이 없습니다. 관리자만 접근 가능합니다.' });
        }
        req.user = decoded;
        next();
    } catch (e) {
        res.status(400).json({ message: '유효하지 않은 토큰입니다.' });
    }
}

module.exports = admin;