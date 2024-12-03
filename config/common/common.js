const mongoObjectId = function () {
    var timestamp = (new Date().getTime() / 1000 | 0).toString(16);
    return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function () {
        return (Math.random() * 16 | 0).toString(16);
    }).toLowerCase();
};

const getClientIp = function (req) {
    let ip;
    if (req.headers['x-forwarded-for']) {
        return ip = req.headers['x-forwarded-for'].split(",")[0];
    } else if (req.connection && req.connection.remoteAddress) {
        return ip = req.connection.remoteAddress;
    } else {
        return ip = req.ip;
    }
    // console.log("client IP is *********************" + ip);
};

const sort = function (res, name) {
    res.sort((a, b) => {
        return a[name].toLowerCase().localeCompare(b[name].toLowerCase())
    })
}
const getDays = function (day, year, value) {

    var d = new Date(),
        month = year,

        all = [];

    var num;
    switch (day) {
        case "Sunday":
            num = 0;
            break;
        case "Monday":
            num = 1;
            break;
        case "Tuesday":
            num = 2;
            break;
        case "Wednesday":
            num = 3;
            break;
        case "Thursday":
            num = 4;
            break;
        case "Friday":
            num = 5;
            break;
        case "Saturday":
            num = 6;
    }

    // Get all the other days in the year
    if (value === 'year') {
        d.setFullYear(year, 0, 1);
        // Get the first day in the year
        while (d.getDay() !== num) {
            d.setDate(d.getDate() + 1);
        }
        while (d.getFullYear().toString() === year) {
            all.push(new Date(d.getTime()));
            d.setDate(d.getDate() + 7);
        }
    }
    else {
        d.setDate(1);
        // Get the first Monday in the month
        while (d.getDay() !== num) {
            d.setDate(d.getDate() + 1);
        }

        // Get all the other Mondays in the month
        while (d.getMonth() === month) {
            all.push(new Date(d.getTime()));
            d.setDate(d.getDate() + 7);
        }

    }


    return all;
}
const daysInYear = function daysInYear(year) {
    if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
        // Leap year
        return 366;
    } else {
        // Not a leap year
        return 365;
    }
}
const daysInMonth = function daysInMonth(month, year) {
    var now = new Date();
    // console.log("now.getMonth()", now.getMonth());
    //return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return new Date(year, month, 0).getDate();
}


// get sundays betwwen two dates
function getSundayInaMonth(dString1, dString2) {
    var d1 = new Date(Date.parse(dString1)); //"MM/DD/YYYY"
    var d2 = new Date(Date.parse(dString2));
    var aDay = 24 * 60 * 60 * 1000;
    let Sun = 0;
    for (var d, i = d1.getTime(), n = d2.getTime(); i <= n; i += aDay) {
        d = new Date(i).getDay();
        if (d === 0) Sun++;
    }
    return Sun;
}


// get nuber of sundays given month
function sundaysInMonth(m, y) {
    var days = new Date(y, m, 0).getDate();
    var sundays = [8 - (new Date(m + '/01/' + y).getDay())];
    for (var i = sundays[0] + 7; i < days; i += 7) {
        sundays.push(i);
    }
    return sundays;
}

module.exports.mongoObjectId = mongoObjectId;
module.exports.getClientIp = getClientIp;
module.exports.sort = sort;
module.exports.getDays = getDays;
module.exports.daysInYear = daysInYear;
module.exports.daysInMonth = daysInMonth;
module.exports.getSundayInaMonth = getSundayInaMonth;
module.exports.sundaysInMonth = sundaysInMonth;
