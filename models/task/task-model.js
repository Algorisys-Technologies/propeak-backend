const mongoose = require("mongoose");
const { SubTask, SubTaskSchema } = require("../sub-task/subtask-model");
const { Message, MessageSchema } = require("../message/message-model");
const {
  UploadFile,
  UploadFileSchema,
} = require("../upload-file/upload-file-model");

// Define the database model
const TaskSchema = new mongoose.Schema(
  {
    // userId: {
    //   type: String,
    // },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    completed: {
      type: Boolean,
    },
    tag: [{ type: String }],
    status: {
      type: String,
    },
    storyPoint: {
      type: Number,
      required: false,
      default: 0,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    depId: {
      type: String,
    },
    taskType: {
      type: String,
    },
    priority: {
      type: String,
    },
    createdOn: {
      type: Date,
    },
    modifiedOn: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    modifiedBy: {
      // type: String,
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    isDeleted: {
      type: Boolean,
    },
    sequence: {
      type: String,
    },
    messages: [MessageSchema],
    uploadFiles: [UploadFileSchema],
    subtasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subTask",
        // required: true,
      },
    ],
    dateOfCompletion: {
      type: String,
    },
    customFieldValues: {
      type: Map,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "project",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },

    taskStageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "taskStage",
      // required: true,
    },
    creation_mode: {
      type: String,
      enum: ["AUTO", "MANUAL"],
      // required: true,
    },
    lead_source: {
      type: String,
      enum: ["INDIAMART", "EMAIL", "USER", "EXCEL", "PRODUCT_TASK", "OTHERS"],
      // required: true,
    },
    interested_products: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product",
        },
        quantity: {
          type: Number,
        },
        priority: {
          type: String,
        },
        negotiated_price: {
          type: Number,
        },
        unit: {
          type: String,
        },
        total_value: {
          type: Number,
        },
      },
    ],
    publish_status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
  },

  { versionKey: false }
);

// Use the unique validator plugin
// TaskSchema.plugin(unique, { message: 'That {PATH} is already taken.' });
TaskSchema.index({ companyId: 1, isDeleted: 1 });
TaskSchema.index({ endDate: 1 });
TaskSchema.index({ startDate: 1 });
TaskSchema.index({ createdOn: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ projectId: 1 });
TaskSchema.index({ userId: 1 });
TaskSchema.index({ isDeleted: 1 });
TaskSchema.index({ companyId: 1, endDate: 1 });
TaskSchema.index({ companyId: 1, status: 1 });
TaskSchema.index({ projectId: 1, isDeleted: 1 });

TaskSchema.virtual("isOverdue").get(function () {
  return this.endDate < new Date() && this.status !== "completed";
});

TaskSchema.virtual("isActive").get(function () {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now && !this.completed;
});

const Task = mongoose.model("task", TaskSchema);
module.exports = Task;
