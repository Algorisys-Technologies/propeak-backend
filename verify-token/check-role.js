function checkRole(req, res, next) { 
    // console.log("req", req.userInfo.userRole);
    if (req.userInfo.userRole === "support") {
        req.userInfo.userRole='admin'
    }
    // console.log("req.userInfo",req.userInfo);
    next();
}

module.exports = checkRole;