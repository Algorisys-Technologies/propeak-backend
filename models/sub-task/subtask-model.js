const mongoose = require("mongoose");

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
    // status: {
    //   type: String
    // },
  },
  { versionKey: false }
);

//   // Use the unique validator plugin
//   SubTaskSchema.plugin(unique, { message: 'That {PATH} is already taken.' });

module.exports = {
  SubTask: mongoose.model("subTask", SubTaskSchema),
  SubTaskSchema: SubTaskSchema,
};
