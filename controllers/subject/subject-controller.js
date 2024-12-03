const mongoose = require('mongoose');
const Subject = require('../../models/subject/subject-model');
const jwt = require('jsonwebtoken');
const { logError, logInfo } = require('../../common/logger');
const objectId = require('../../common/common');

exports.addSubjectForChats = ((req,res) => {
    let newSubject = new Subject({
        title: req.body.subjectTitle,
        projectId: req.body.projectId ? req.body.projectId : "",
        edit: false,
        isDeleted: false,
        createdOn: new Date(),
        createdBy: req.userInfo.userId,
        discussion: []
      });
    newSubject.save()
    .then((result) => {
        logInfo(result.length,"addSubjectForChats added new subject");
        res.json(result);
    })
    .catch((err) => {
        logError(err,"addSubjectForChats err");
    })
})

exports.getAllSubjects = ((req,res) => {
    Subject.find({$or:[{isDeleted: null},{isDeleted:false}]})
    .then((result) => {
        let subjects = result.filter((r) => {
            return r.projectId === undefined || r.projectId === null || r.projectId === ""
        })
        logInfo(result.length,"getAllSubjects result");
        res.json(subjects);
    })
    .catch((err) => {
        logError(err,"getAllSubjects err");
        res.status(500).json({ success: false, msg: `Something went wrong. ${err}` });
    });
})

exports.getProjectSubjects = ((req, res) => {
    Subject.find({projectId: req.params.projectId})
    .then((result) => {
        // console.log("result",result);
        let subjects = result.filter((s) => {
            return s.isDeleted === false;
        })
        // console.log("subjects",subjects);
        res.json(subjects);
    })
    .catch((err) => {
        // console.log("err",err);
    })
})

exports.deleteSubjectForChats = ((req, res) => {
    Subject.findOneAndUpdate({_id:req.body.subjectId},{$set: {isDeleted: true}}, { "new": true})
    .then((result) => {
        logInfo(result.length,"deleteSubjectForChats result");
        res.json({msg: "Subject Deleted Successfully"})
    })
    .catch((err) => {
        logError(err,"deleteSubjectForChats err");
    })
})

exports.editSubjectForChats = ((req, res) => {
    Subject.findOneAndUpdate({_id:req.body.subjectId},{$set: {title: req.body.subjectTitle}}, { "new": true })
    .then((result) => {
        logInfo(result.length,"editSubjectForChats result");
        res.json({msg: "Subject Updated Successfully"})
    })
    .catch((err) => {
        logError(err,"editSubjectForChats err");
    })
})

exports.addMessage = ((req, res) => {
    logInfo(req.body,"addMessage req.body");
    let findMessage=(messages,id,newMsg)=>{
        for(let i=0;i<messages.length;++i){
            if(messages[i]._id.toString()===id)
            {
                (messages[i].replyMessages && messages[i].replyMessages.length > 0) ? messages[i].replyMessages.push(newMsg) : (messages[i].replyMessages=[newMsg]);
                break;
            }
            else if(messages[i].replyMessages && messages[i].replyMessages.length > 0)
            {
                messages[i].replyMessages= findMessage(messages[i].replyMessages,id,newMsg);
            } 
        }
        return messages;
    }
  
    let newMessage = {
        _id: objectId.mongoObjectId(),
        title: req.body.title,
        projectId: req.body.projectId ? req.body.projectId : "",
        isDeleted: false,
        createdBy: req.userInfo.userId,
        createdOn: new Date(),
        replyMessages: []
    }
    Subject.findById(req.body.subjectId)
    .then((result) => {
        if(!req.body.messageId){
            (result.discussion && result.discussion.length > 0) ? result.discussion.push(newMessage) : result.discussion=[newMessage];
        } else {
             result.discussion=findMessage(result.discussion,req.body.messageId,newMessage);
        }
        return result.save();
    })
    .then((result) => {
        logInfo(result.length,"addMessage result");
        res.json(newMessage);
    })
    .catch((err) => {
        logError(err,"addMessage err");
    })
})

exports.getMessagesBySubjectId = ((req,res) => {
    Subject.find({_id: req.params.subjectId})
    .then((result) => {
        let messages = result[0].discussion && result[0].discussion.filter((r) => {
            return r.isDeleted === false || r.isDeleted === null;
        })
        logInfo(result.length,"getMessagesBySubjectId result");
        res.json(messages);
    })
    .catch((err) => {
        logError(err,"getMessagesBySubjectId err");
    })
})

exports.deleteMessagesBySubjectId = ((req,res) => {
    logInfo(req.body,"deleteMessagesBySubjectId req.body");
    Subject.findById(req.body.subjectId)
    .then((result) => {
        let findMessage=(messages,id)=>{
            for(let i=0;i<messages.length;++i){
                if(messages[i]._id.toString()===id)
                {
                    messages[i].isDeleted = true;
                    break;
                }
                else if(messages[i].replyMessages && messages[i].replyMessages.length > 0)
                {
                    let updatedReplyMessages = messages[i].replyMessages.filter((r) => {
                        return r.isDeleted === false;
                    })
                    messages[i].replyMessages = findMessage(updatedReplyMessages,id);
                } 
            }
            return messages;
        }

        let discussionMessages = (result.discussion && result.discussion.length > 0) && result.discussion.filter((r) => {
            return r.isDeleted === false;
        })
        if(discussionMessages.length > 0){
            result.discussion=findMessage(discussionMessages,req.body.messageId);
        }
        return result.save();
    })
    .then((result1) => {
        logInfo(result1.length,"deleteMessagesBySubjectId result");
        res.json({
            msg:"Message deleted successfully"
        })
    })
    .catch((err) => {
        logError(err,"deleteMessagesBySubjectId err");
    })
})