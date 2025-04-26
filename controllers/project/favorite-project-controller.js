const mongoose = require("mongoose");
const FavoriteProject = require("../../models/project/favorite-project-model");
const Project = require("../../models/project/project-model");
const { logError, logInfo } = require("../../common/logger");
const access = require("../../check-entitlements");
const sortData = require("../../common/common");
const { ObjectId } = require("mongodb");
const errors = {
  NOT_AUTHORIZED: "Your are not authorized",
};
const User = require("../../models/user/user-model")
const Task = require("../../models/task/task-model");
exports.getAllProjects = (req, res) => {
  // let userRole = req.userInfo.userRole.toLowerCase();
  // let accessCheck = access.checkEntitlements(userRole);
  // if(accessCheck === false) {
  //     res.json({ err: errors.NOT_AUTHORIZED });
  //     return;
  // }
  let userId = req.body.userId;
  FavoriteProject.find({
    userId: userId,
  }).then((result) => {
    var projectIds = [];
    for (let i = 0; i < result.length; i++) {
      projectIds.push(new ObjectId(result[i].projectId));
    }

    let projectFields = {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        startdate: 1,
        enddate: 1,
        userid: 1,
        status: 1,
        projectUsers: 1,
        notifyUsers: 1,
        uploadFiles: 1,
        group: 1,
        miscellaneous: 1,
        archive: 1,
        "tasks.status": 1,
        "tasks.completed": 1,
        "tasks.category": 1,
        "tasks.isDeleted": 1,
        "tasks.userId": 1,
        "tasks.endDate": 1,
      },
    };
    let userCondition = {
      isDeleted: false,
      _id: {
        $in: projectIds,
      },
    };
    if (req.body.showArchive === false) {
      userCondition["archive"] = false;
    }
    let projectCond = {
      $match: userCondition,
    };
    logInfo(
      [projectCond, projectFields],
      "getAllProjects Favorite filtercondition"
    );
    Project.aggregate([projectCond, projectFields])
      .then((result1) => {
        let projects =
          result1 &&
          result1.map((p) => {
            p.totalTasks = 0;
            p.completedTasks = 0;
            p.inProgressTasks = 0;
            p.activeTasks = 0;
            let attachments = p.uploadFiles.filter(
              (u) => u.isDeleted === false
            );
            p.attachments = attachments.length;
            if (p.tasks && Array.isArray(p.tasks)) {
              p.tasks = p.tasks.filter((t) => t.isDeleted === false);
              p.totalTasks = p.tasks.length;
              p.tasks.map((t) => {
                if (t.completed) {
                  p.completedTasks++;
                } else if (t.category === "inprogress") {
                  p.inProgressTasks++;
                }
                return t;
              });
              p.tasks = [];
            }
            return p;
          });
        logInfo(projects, "getAllProject result");
        sortData.sort(projects, "title");

        res.json({
          success: true,
          data: projects,
        });
      })
      .catch((err) => {
        logError(err, "getAllProject err");
        res.json({
          err,
        });
      });
  });
};

exports.getFavoriteProjects = async (req, res) => {
  try {
    let page = parseInt(req.query.page || "0");
    const limit = 10;
    const skip = page * limit;
    const { stageId, companyId, userId, archive, isFavorite, actualUserId } = req.body;

    const favorites = await FavoriteProject.find({ userId: actualUserId });

    const favoriteProjectIds = favorites.map((f) => new mongoose.Types.ObjectId(f.projectId));

    const projectWhereCondition = {
      _id: { $in: favoriteProjectIds },
      projectStageId: stageId,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      companyId: companyId,
      isFavourite: true,
      projectType: { $ne: "Exhibition" },
    };
    
    let iprojects = await Project.find(projectWhereCondition)
    .sort({ createdOn: -1 })
    .skip(skip)
    .limit(limit);  
    
    const totalCount = await Project.countDocuments(projectWhereCondition);
    const totalPages = Math.ceil(totalCount / 10);
    console.log("totalCount", totalCount, "totalPages", totalPages, "asdasd");

    const projects = await Promise.all(
      iprojects.map(async (p) => {
        const users = await User.find({ _id: { $in: p.projectUsers } }).select(
          "name"
        );
        const createdByUser = await User.findById(p.createdBy).select("name");
        const tasksCount = await Task.countDocuments({
          projectId: p._id,
          isDeleted: false,
        });
        // const isFavourite = await FavoriteProject.findOne({
        //   projectId: p._id,
        //   userId,
        // });

        return {
          ...p.toObject(),
          tasksCount,
          // isFavourite: !!isFavourite,
          projectUsers: users.map((user) => user.name),
          createdBy: createdByUser ? createdByUser.name : "Unknown",
        };
      })
    );

    return res.json({
      success: true,
      projects,
      totalCount,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching favorite projects:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.toggleFavoriteProject = async (req, res) => {
  console.log("toggleFavoriteProject")
  try {
    let isExists = await FavoriteProject.findOne({
      userId: req.body.userId,
      projectId: req.body.projectId, 
    })
    console.log(isExists, "from toggleFavoriteProject")

    if(isExists){
      await FavoriteProject.deleteMany({
        projectId: req.body.projectId,
        userId: req.body.userId,
      })
      await Project.updateOne(
        {_id: req.body.projectId},
        { $set: {isFavourite: false}}
      )
    }
    else{
      let favProject = new FavoriteProject({
        userId: req.body.userId,
        projectId: req.body.projectId,
      });

      console.log(favProject, "from favProject")
      await favProject.save()
      await Project.updateOne(
        {_id: req.body.projectId},
        { $set: {isFavourite: true}}
      )
      return res.json({success: true, message: "Toggled Favourite"})
    }

    return res.json({success: true, message: "Removed Favourite"})
   
 
  } catch (e) {
    console.log(e);
    return res.json({success: false, message: e})
  }
};

// exports.toggleFavoriteProject = async (req, res) => {
//   try {
//     console.log("toggle favourite")
//     let isExists = await FavoriteProject.findOne({
//       userId: req.body.userId,
//       projectId: req.body.projectId, 
//     })

//     if(isExists){
//       await FavoriteProject.deleteMany({
//         projectId: req.body.projectId,
//         userId: req.body.userId,
//       })
//     }
//     else{
//       let favProject = new FavoriteProject({
//         userId: req.body.userId,
//         projectId: req.body.projectId,
//       });
//       await favProject.save()
//     }

//     return res.json({success: true, message: "Toggled"})
   
 
//   } catch (e) {
//     console.log(e);
//     return res.json({success: false, message: e})
//   }
// };

exports.updateFavoriteProject = (req, res) => {
 
  FavoriteProject.deleteMany({
    projectId: req.body.projectId,
    userId: req.body.userId,
  })
    .then((result) => {
      logInfo(result, "updateFavoriteProject result");
      res.json({
        message: "Removed successfully in Favorites",
      });
    })
    .catch((err) => {
      logError(err, "updateFavoriteProject err");
      res.json({
        err,
      });
    });
};
