const mongoose = require('mongoose');
const Project = require('../../models/project/project-model');
const uuidv4 = require('uuid/v4');
const jwt = require('jsonwebtoken');
const secret = require('../../config/secret');
// const config = require('../config/db');
const audit = require('../audit-log/audit-log-controller');
const FavoriteProject = require('../../models/project/favorite-project-model');
test = require('assert');
const accessConfig = require('../../common/validate-entitlements');
const { TaskSchema, Tasks } = require('../../models/task/task-model');
const Task = require('../../models/task/task-model');

const errors = {
  PROJECT_DOESNT_EXIST: 'Project does not exist',
  ADD_CLONEPROJECT_ERROR: 'Error occurred while adding the project',
};

exports.projectClone = ((req, res) => {

  console.log("in project clone")
 
    Project.findById(req.body.projectId)
    .then(async (result) => {
      // let tasks = await TaskSchema.
      let project = new Project({
        title: 'Clone of ' +  result.title,
        description: result.description,
        startdate: result.startdate,
        enddate: result.enddate,
        status: 'new',
        projectStageId: result.projectStageId,
        taskStages: result.taskStages,
        userid: result.userid,
        companyId: result.companyId,
        group: result.group,
        sendnotification: 'false',
        createdBy: result.userid,
        createdOn: new Date(),
        modifiedBy: result.userId,
        modifiedOn: new Date(),
        isDeleted: result.isDeleted,
        projectUsers: result.projectUsers,
        notifyUsers: result.notifyUsers,
        messages: [],
        uploadFiles: [],
        tasks: [],
        miscellaneous: result.miscellaneous,
        archive: result.archive
      })
      project.save()
      .then((res1) => {
       
        let userIdToken = result.userName;
        let field = 'Project Clone';
        audit.insertAuditLog(result.title, res1.title, 'Project', field, res1.title, userIdToken, res1._id);
        res.json(project);
     
      })
    })
    .catch((err) => {
      // Show failed if all else fails for some reasons
      console.log(err)
       res.json({
         err: err
       });
     });

});

exports.projectAutoClone = ((req, res) => {
try{
  Project.findById(req.params.projectId)
  .then((result) => {  
    let tasks = result.tasks.filter((t) => {
      return t.isDeleted === false;
    })

    let cloneTasks =[];
    if (tasks.length > 0) {
      
      cloneTasks=     tasks.map((t) => {
        let subtasks = t.subtasks.filter((s) => {
          return s.isDeleted === false;
        })
        let cloneSubTasks = subtasks.map((s) => {
            let subTask = {
              title:  s.title,
              completed: false,
              edit: false,
              dateOfCompletion: '',
              isDeleted: false
            }
            return subTask;
          })
    
          let tasks = {
            userId: t.userId,
            title: 'Clone of ' +  t.title,
            description: t.description,
            completed: false,
            category: 'todo',
            tag: t.tag,
            status: 'new',
            storyPoint: t.storyPoint,
            startDate: t.startDate,
            endDate: t.endDate,
            depId: '',
            taskType: t.taskType,
            priority: 'medium',
            createdOn: new Date(),
            createdBy: result.userid,
            modifiedOn: new Date(),
            modifiedBy: result.userid,
            isDeleted: false,
            sequence: result.tasks.length + 1,
            subtasks: []
          }
          return tasks;
        })
    }

    let project = new Project({
      title: 'Clone of ' +  result.title,
      description: result.description,
      startdate: result.startdate,
      enddate: result.enddate,
      status: 'new',
      category: 'inprogress,todo,completed',
      userid: result.userid,
      companyId: result.companyId,
      group: result.group,
      period: result.period,
      sendnotification: 'false',
      createdBy: result.userid,
      createdOn: new Date(),
      modifiedBy: result.userid,
      modifiedOn: new Date(),
      isDeleted: result.isDeleted,
      projectUsers: result.projectUsers,
      notifyUsers: result.notifyUsers,
      messages: [],
      uploadFiles: [],
      tasks: cloneTasks,
      notifyUsers:result.notifyUsers,
      miscellaneous: false,
      archive: false
    })
    project.save()
    .then((res1) => {
      let field = 'Project Clone';
      res.json(project);
    })
    .catch((err) => {
    // Show failed if all else fails for some reasons
     res.json({
       err: err
     });
   });
  })
}
  catch(e){
  // console.log(e);
  }
});