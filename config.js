
module.exports = Object.freeze({
    url: process.env.URL + "api",
    host: 'smtp-relay.brevo.com',
    serverPort: 3001,
    fromEmail: 'support@algorisys.com',
    link: process.env.URL,
    taskStatusNotificationSchedule: '*/30 * * * * 1-6',
    dsrNotificationSchedule: '*/30 * * * * 1-6',
    clearTokenSchedule: '*/30 * * * * 1-6',
    projectAutoCloneSchedule: '30 48 18 * * 1-6',
    emailSchedule: '*/1 * * * *',
    emailBatchSize: 5,
    emailBatchWaitTime: 60000,
    tokenKey: '123',
    companyCode: 'Algo_',
    burndownSchedule: '*/30 * * * * 1-6',
    userAccountUnlockSchedule: '*/1 * * * * *',
    dailySummaryReportSchedule: '30 51 10 * * 1-6',
    leaveNotificationSchedule: '*/30 * * * * 1-6',
    pendingLeaveapproveSchedule: '00 30 11 * * 2-7'  ,
    contactsSchedule: "*/1 * * * *",
    pendingLeaveapproveSchedule: '00 30 11 * * 2-7',
    fetchEmailSchedule: '*/1 * * * * ', // Every minute
    fetchEmailScheduleEvery10Min: '*/10 * * * *', // Every 10 minutes
    fetchEmailScheduleEveryHour: '0 * * * *', // Every hour
    fetchEmailScheduleDaily: '0 0 * * *', // Every day
    fetchEmailScheduleWeekly: '0 0 * * 0', // Every week
    fetchEmailScheduleMonthly: '0 0 1 * *', // Every month


});