const path = require("path");
require("dotenv").config();


module.exports = Object.freeze({
  UPLOAD_PATH: process.env.UPLOAD_PATH,
  // host: "smtp.mail.yahoo.com",
  // port: 465,
  // auth: {
  //   user: "devbootcamp24x7@yahoo.com",
  //   pass: "uuiznvqfwhiiqrjy",
  // },
  host: "smtp-relay.brevo.com",
  port: 465, // non secure 587,
  secure: true,
  auth: {
    user: "5208e9001@smtp-brevo.com",
    pass: "ODBfjtL0UcavY1bp",
  },
  link: process.env.URL,
  // from: "devbootcamp24x7@yahoo.com",
  from: "support@algorisys.com",
  serverPort: 3001,
  //staging
  db: process.env.DB,
  taskEmailContent:
    `Hi, <br/> <br/> A new task has been created.<br/><br/> <b> Project </b> : #projectName# <br/> <b> Task </b> : #title#
    <br/> <b> Priority </b> : #priority# <br/> <b> Description </b> : #description# <br/> <br/> To view task details, click <a href="${process.env.URL}tasks/edit/#projectId#/#newTaskId#/update" alt="task">
    here</a>  <br/><br/> Thanks, <br/> proPeak Team`,
  taskEmailAssignContent:
    `Hi, <br/> <br/> You have been assigned to the task. <br/><br/> <b> Project </b> : #projectName# <br/> <b> Task </b> : #title#
    <br/> <b> Priority </b> : #priority# <br/> <b> Description </b> : #description# <br/> <br/> To view task details, click <a href="${process.env.URL}tasks/edit/#projectId#/#newTaskId#/update" alt="task">
    here</a>  <br/><br/> Thanks, <br/> proPeak Team`,
  taskEmailStageContent:
    `Hi, <br/> <br/> Task Stage Changed. <br/><br/> <b> Task </b> : #title# <br/> <b> Project </b> : #projectName#
    <br/> <b> Priority </b> : #priority# <br/>  <b> Stage Changed </b> : #status# <br/> <b> Description </b> : #description# <br/> <br/> To view task details, click <a href="${process.env.URL}tasks/edit/#projectId#/#newTaskId#/update" alt="task">
    here</a>  <br/><br/> Thanks, <br/> proPeak Team`,
  projectEmailCreateContent:
    `Hi, <br/> <br/> A new project has been created. <br/><br/> <b> Project </b> : #projectName# <br/>
    <b> Description </b> : #description# <br/> <br/> To view project details, click <a href="${process.env.URL}tasks/#projectId#/kanban/stage" alt="task">
    here</a>  <br/><br/> Thanks, <br/> proPeak Team`,
  projectEmailArchiveContent:
    `Hi, <br/> <br/> A project has been Archived. <br/><br/> <b> Project </b> : #projectName# <br/>
    <b> Description </b> : #description# <br/> <br/> To view project details, click <a href="${process.env.URL}tasks/#projectId#/kanban/stage" alt="task">
    here</a>  <br/><br/> Thanks, <br/> proPeak Team`,
  projectEmailStageContent:
    `Hi, <br/> <br/> Project Stage Changed. <br/><br/> <b> Project </b> : #projectName# <br/>
    <b> Description </b> : #description# <br/> <br/> To view project details, click <a href="${process.env.URL}tasks/#projectId#/kanban/stage" alt="task">
    here</a>  <br/><br/> Thanks, <br/> proPeak Team`,
  projectEmailFieldContent:
    `Hi, <br/> <br/> Custom Field Update at #title# level. <br/><br/> <b> Project </b> : #projectName# <br/>
     <b> Key </b> : #key# <br/>  <b> Label </b> : #label# <br/>  <b> Type </b> : #type# <br/>
     To view custom field update details, click <a href="${process.env.URL}projects/edit/#projectId#/#configPath#" alt="custom">
    here</a>  <br/><br/> Thanks, <br/> proPeak Team`,
  editlink: process.env.PUBLIC_URL + "project/tasks/",
      
  servercert: "../cert/localhost.crt",
  servercertkey: "../cert/localhost.key",
  secureSite: true,
  securePort: 9000,
  tokenExpiry: 5000,
  refreshTokenExpiry: 3600000,
  msgLink: process.env.URL + "project/task/edit/", 
  daysForMessageMail: 3,
  projectStatusCheck: ["inprogress", "new", "onHold"],

  socketPort: 3002,
  maxInprogressTaskCount: 2,
  defaultEmail: "support@algorisys.com", //default emailId for sending the email
  leaveEmailContent:
    " //This is a system generated mail please do not reply this mail  <br> Dear Ma'am/Sir,<br><br> This is to inform you that I will not be able to attend office from <b>{fromDate}</b> to <b>{toDate}</b>.<br>Kindly grant me permission for <b>{workingDays}</b> day/s <b>{leaveType}.</b>.<br>Reason: {reason} <br>Please click on the following link, http://localhost:3000/leave-details/{leaveId} to view the leave details.<br><br> Thanks and Regards,<br> proPeak Team", //email Body
  leaveSubject: "Leave application {fromDate} to {toDate}- {userName}", // leave subject
  prodMode: "ON", //For testing purpose locally / after deploting on server
  approveRejectEmailContent:
    "//This is a system generated mail please dont reply <br> Your Leave has been {leaveStatus} <br>Reason: {reasonOfRejection} <br> Thanks and Regards,<br> {loggedInUser}", //Email on the basis of acceptance and rejection
  approveRejectSubject: "Leave {status} - {fromDate}  to  {toDate}", //status on the basis of acceptance and rejection,
  holidayList: [],
  monthStart: 3,
  months: [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2],
  taskEmailLink: "/project/task/edit/#projectId#/#newTaskId#",
  subTaskEmailLink:
    process.env.NODE_ENV == "development"
      ? "http://localhost:3000/tasks"
      : "https://crm.algorisys.com/tasks",
  //taskEmailLink: "http://localhost:3000/tasks",
  msgEmailLink: "/project/task/edit/",
  redisClientPort: 6379,
  redisClientHost: "127.0.0.1",
  accessRightsExpiry: 2592000,
  rabbitMQ_exchangeName: "ALGO_message_exch",
  rabbitMQ_connectionKey: "amqp://localhost",
  taskStatusEmailContent: `Hi, <br/> <br/> Task assigned to user is completed. task: <br/><br/> <b> Project </b> : #projectName# <br/> <b> Task </b> : #title#" +
    '<br/> <b> Priority </b> : #priority# <br/> <b> Description </b> : #description# <br/> <br/> To view task details, click <a href="${process.env.URL}project/task/edit/#projectId#/#newTaskId#" alt="task">' +
    "here</a> or copy this URL on the browser ${process.env.URL}tasks/edit/#projectId#/#newTaskId#"
    <br/><br/> Thanks, <br/> proPeak Team`,
  companyCode: "Algo_",
  //emails: "dharmendra.singh@algorisys.com, rajesh@algorisys.com , radhika@algorisys.com"
  emails: "support@algorisys.com",
  applytoEmail: "madhuri.bansode@algorisys.com",
  loginAttemptCount: 5,
  //applytoEmail: "dharmendra.singh@algorisys.com",
  unLockAccountHour: 1,
  beforeThreeDay: 3,
  beforeSevenDay: 7,
  minWorkingHours: 8,
  showMessage: true,
  leaveLink: "http://localhost:3000/leave-details/",
  extentionFile: [
    "PDF",
    "DOCX",
    "PNG",
    "JPEG",
    "JPG",
    "TXT",
    "PPT",
    "XLSX",
    "XLS",
    "PPTX",
  ],
  projectCreation: "unLimited",
  taskCreation: "unLimited",
  userCreation: "unLimited",
  defaultProject: "Daily Task",
  //projectCreation:57,
  // taskCreation:2,
  //userCreation:54
});
