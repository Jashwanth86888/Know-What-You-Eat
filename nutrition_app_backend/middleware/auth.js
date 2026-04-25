// Admin check reads role from request header: x-user-role: admin
// On login the server returns the user's role.
// The client must send it as a header on every admin request.
// In a real app this would use JWT — this is simple and safe for college level.

function checkAdmin(req, res, next) {
    const role = req.headers['x-user-role'];

    if (!role || role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }

    next();
}

module.exports = { checkAdmin };
