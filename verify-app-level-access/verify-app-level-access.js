const AccessRight = require('../models/access-right/applevelaccessright-model');
const {
    logError,
    logInfo
} = require('../common/logger');
const accessConfig = require('../common/validate-entitlements');

async function verifyAppLevelAccess(req, res, next) {
    // console.log("req",req);

    let projectAccess = req.userInfo.userAccess;
    let userRole = req.userInfo.userRole;
    let checkAccess = (result, group, entitlementId) => {
        let value = false;
        if (result !== null && result !== undefined && result.length > 0) {
            for (let i = 0; i < result.length; i++) {
                if (result[i].group === group && result[i].entitlementId === entitlementId) {
                    value = true;
                    break;
                }
            }
        }
        return value;
    }

    let unauthorizedResponse = (res) => {
        return res.status(200).json({  err: 'You do not have access' });
    }

    AccessRight.find({ userId: req.userInfo.userId })
        .then((result) => {
            logInfo(result.length, " verifyAppLevelAccess getUserAccessRights result");

            switch (req.originalUrl) {

                case '/api/projects/addProject': let addProject = checkAccess(result, 'Projects', 'Create');
                    if (!addProject) {
                        return unauthorizedResponse(res);
                    }
                    break;

                    case '/api/projects/archiveProject': let archiveProject = checkAccess(result, 'Projects', 'Archive');
                    if (!archiveProject) {
                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/projects/editProject': let editProject = checkAccess(result, 'Projects', 'Edit');
                    if (projectAccess && projectAccess.length > 0) {
                       // console.log('projectId ',req.body.id);
                        editProject = accessConfig.validateEntitlements(projectAccess, req.body.id, 'Projects', 'edit',userRole);
                    }
                    if (!editProject) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/projects/deleteProject': let deleteProject = checkAccess(result, 'Projects', 'Delete');
                    if (projectAccess && projectAccess.length > 0) {
                        deleteProject = accessConfig.validateEntitlements(projectAccess, req.body.id, 'Projects', 'delete',userRole);
                    }
                    if (!deleteProject) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/cloneprojects/cloneProject': let cloneProject = checkAccess(result, 'Projects', 'Clone');
                    if (projectAccess && projectAccess.length > 0) {
                        cloneProject = accessConfig.validateEntitlements(projectAccess, req.body.projectId, 'Projects', 'clone',userRole);
                    }
                    if (!cloneProject) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/tasks/addTask': let addTask = checkAccess(result, 'Task', 'Create');
                    if (!addTask) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/tasks/updateTask': let updateTask = checkAccess(result, 'Task', 'Edit');
                    if (!updateTask) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/tasks/updateSubTasks': let deleteTask = checkAccess(result, 'Task', 'Delete');
                    let editTask = checkAccess(result, 'Task', 'Edit');
                    if (!deleteTask && !editTask) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/clonetasks/cloneTask': let cloneTask = checkAccess(result, 'Task', 'Clone');
                    if (!cloneTask) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/users/addUser': let addUser = checkAccess(result, 'Users', 'Create');
                    if (!addUser) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/users/editUser': let editUser = checkAccess(result, 'Users', 'Edit');
                    if (!editUser) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/users/deleteUser': let deleteUser = checkAccess(result, 'Users', 'Delete');
                    if (!deleteUser) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/categories/addCategory': let addCategory = checkAccess(result, 'Category', 'Create');
                    let editCategory = checkAccess(result, 'Category', 'Edit');
                    if (!addCategory && !editCategory) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/categories/deleteCategory': let deleteCategory = checkAccess(result, 'Category', 'Delete');
                    if (!deleteCategory) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/companies/addCompany': let addCompany = checkAccess(result, 'Company', 'Create');
                    if (!addCompany) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/companies/editCompany': let editCompany = checkAccess(result, 'Company', 'Edit');
                    if (!editCompany) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/companies/deleteCompany': let deleteCompany = checkAccess(result, 'Company', 'Delete');
                    if (!deleteCompany) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/groups/addGroup': let addGroup = checkAccess(result, 'User Groups', 'Create');
                    if (!addGroup) {


                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/groups/editGroup': let editGroup = checkAccess(result, 'User Groups', 'Edit');
                    if (!editGroup) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/groups/deleteGroup': let deleteGroup = checkAccess(result, 'User Groups', 'Delete');
                    if (!deleteGroup) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/notifications/addNotification': let addNotification = checkAccess(result, 'Notification', 'Create');
                    if (projectAccess && projectAccess.length > 0) {
                        addNotification = accessConfig.validateEntitlements(projectAccess, req.body.projectId, 'Notification', 'create',userRole);
                    }
                    if (!addNotification) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/notifications/editNotification': let editNotification = checkAccess(result, 'Notification', 'Edit');
                    if (projectAccess && projectAccess.length > 0) {
                        editNotification = accessConfig.validateEntitlements(projectAccess, req.body.projectId, 'Notification', 'edit',userRole);
                    }
                    if (!editNotification) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/notifications/deleteNotification': let deleteNotification = checkAccess(result, 'Notification', 'Delete');
                    if (projectAccess && projectAccess.length > 0) {
                        deleteNotification = accessConfig.validateEntitlements(projectAccess, req.body[0].projectId, 'Notification', 'delete', userRole);
                    }
                    if (!deleteNotification) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/reports/getMonthlyTaskReport': let getTaskReport = checkAccess(result, 'Task Report', 'View');
                    if (projectAccess && projectAccess.length > 0) {
                        getTaskReport = accessConfig.validateEntitlements(projectAccess, req.body.projectId, 'Task Report', 'view',userRole);
                    }
                    if (!getTaskReport) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/reports/getMonthlyUserReport': let getUserReport = checkAccess(result, 'User Report', 'View');
                    if (!getUserReport) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/reports/getUserTaskCountReport': let getUserTaskReport = checkAccess(result, 'StoryPoint Statistics', 'View');
                    if (!getUserTaskReport) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/reports/getProjectProgressReport': let getProjectProgressReport = checkAccess(result, 'Project Progress Reports', 'View');
                    if (!getProjectProgressReport) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/projects/AuditLog': let getAuditLogs = checkAccess(result, 'Audit Report', 'View');
                    if (projectAccess && projectAccess.length > 0) {
                        getAuditLogs = accessConfig.validateEntitlements(projectAccess, req.body.id, 'Audit Report', 'view', userRole);
                    }
                    if (!getAuditLogs) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/favoriteprojects/projects': let getFavouriteProjects = checkAccess(result, 'Favorite Projects', 'View');
                    if (!getFavouriteProjects) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/tasks/todaystasks': let getSummary = checkAccess(result, 'Dashboard', 'View');
                    if (!getSummary) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/uploadFiles/tasksFile': let uploadTasks = checkAccess(result, 'Upload Tasks', 'View');
                    if (projectAccess && projectAccess.length > 0) {
                        uploadTasks = accessConfig.validateEntitlements(projectAccess, req.body.projectId, 'Upload Tasks', 'view', userRole);
                    }
                    if (!uploadTasks) {

                        return unauthorizedResponse(res);
                    }
                    break;

                case '/api/tasks/todaysTasksChartData': let summary = checkAccess(result, 'Dashboard', 'View');
                    if (!summary) {

                        return unauthorizedResponse(res);
                    }
                    break;
                case '/api/reports/getUserPerformanceReport': let getUserPerformanceReport = checkAccess(result, 'User Performance Reports', 'View');
                    if (!getUserPerformanceReport) {

                        return unauthorizedResponse(res);
                    }
                    break;
                case '/api/globalLevelRepository/add': let uploadRepositoryFile = checkAccess(result, 'Global Document Repository', 'Create');
                    if (!uploadRepositoryFile) {

                        return unauthorizedResponse(res);
                    }
                    break;
                case '/api/tasks/getUserProductivity': let summaryUserProductivity = checkAccess(result, 'Dashboard', 'View');
                    if (!summaryUserProductivity) {

                        return unauthorizedResponse(res);
                    }
                    break;
                    
                    case '/api/tasks/getDashboardData': let DashboardData = checkAccess(result, 'Dashboard', 'View');
                    if (!DashboardData) {

                        return unauthorizedResponse(res);
                    }
                    break;

                default: return unauthorizedResponse(res);

            }
            next();
        })
        .catch((err) => {
            logError(err, "getAppLevelaccessRights err");
        })
}

module.exports = verifyAppLevelAccess;