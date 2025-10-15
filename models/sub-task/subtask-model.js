const mongoose = require("mongoose");


// const SubSubTaskSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true },
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
//     dateOfCompletion: { type: Date },
//     status: { type: mongoose.Schema.Types.ObjectId, ref: "taskStage" },
//     isDeleted: { type: Boolean, default: false },
//   },
//   { timestamps: true } 
// );

const SubTaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "task",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    title: {
      type: String,
    },
    completed: {
      type: Boolean,
    },
    dateOfCompletion: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
    },

    storyPoint: {
      type: Number,
    },
    sequence: {
      type: Number,
    },
    // priority: {
    //   type: String
    // },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "taskStage"
    },
    subTasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "subTask"
    }],
    // subTasks : [SubSubTaskSchema]
  },
  { versionKey: false }
);

// SubTaskSchema.add({
//   subTasks: [SubTaskSchema]
// });

//   // Use the unique validator plugin
//   SubTaskSchema.plugin(unique, { message: 'That {PATH} is already taken.' });

module.exports = {
  SubTask: mongoose.model("subTask", SubTaskSchema),
  SubTaskSchema: SubTaskSchema,
};
