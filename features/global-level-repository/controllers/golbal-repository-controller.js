const mongoose = require('mongoose');
const UploadRepositoryFile = require('../../../models/global-level-repository/global-level-repository-model');
const fs = require('fs');
const path = require('path');
const config = require("../../../config/config");
const { logError, logInfo } = require('../../../common/logger');
const access = require('../../../check-entitlements');
const { sendMessageToQueue } = require('../../../rabbitmq');
const VFolder = require('../../../models/vfolder/vfolder-model');
let uploadFolder = config.UPLOAD_PATH

// let uploadFolder = './uploads';


exports.getRepositoryFile = ((req, res) => {
    let id = req.params.fileId
    UploadRepositoryFile.find({ _id: id })
        .then((result) => {
            res.json({
                result
            })
        })
})




exports.getVisitingCardsAccountWise = (req, res) => {
    const companyId = req.body.companyId;
    const accountId = req.body.accountId;
    const page = req.body.page
    const limit = 10
    console.log("accountId", accountId)

    let pathName = req.body.pathData === 'root' ? '/' : req.body.pathData.toLowerCase();
    let itemArray = [];
    let companyContactsFolder = `${uploadFolder}/${companyId}/documents/contacts`;

    // Ensure the "contacts" folder exists for the given company
    if (!fs.existsSync(companyContactsFolder)) {
        fs.mkdirSync(companyContactsFolder, { recursive: true });
    }

    UploadRepositoryFile.find({
        isDeleted: false,
        companyId,
        accountId,
        path: "/contacts"
    }).skip(limit*page).limit(limit)
        .then(async (result) => {

            const totalPages = Math.ceil(await UploadRepositoryFile.countDocuments({
                isDeleted: false,
                accountId,
        companyId,
        path: "/contacts"
            }) / limit)

            let folderPath = req.body.pathData === 'root'
                ? companyContactsFolder
                : `${companyContactsFolder}${pathName}`;

            // Get directories in the specified folderPath
            let dirs = fs.readdirSync(folderPath);

            // Only process directories under the "contacts" folder
            for (let x = 0; x < dirs.length; x++) {
                let a_dir = path.resolve(folderPath, dirs[x]);
                if (fs.statSync(a_dir).isDirectory()) {
                    itemArray.push(`/${dirs[x]}`);
                }
            }

            let dataArray = [];

            // Add directories under "contacts" to the dataArray
            for (let j = 0; j < itemArray.length; j++) {
                let name = itemArray[j].split('/');
                let pathDt = pathName === '/' ? itemArray[j] : `${pathName}${itemArray[j]}`;

                let obj = {
                    "title": name[1],
                    "path": pathDt,
                };
                dataArray.push(obj);
            }

            console.log("result", result)

            // Add files from the result that belong to the "contacts" folder
            for (let i = 0; i < result.length; i++) {
                if (result[i].path.toLowerCase().includes('/contacts')) {
                    let obj = {
                        "_id": result[i]._id,
                        "title": result[i].title,
                        "fileName": result[i].fileName,
                        "description": result[i].description,
                        "path": result[i].path,
                        "isDeleted": result[i].isDeleted,
                        "createdBy": result[i].createdBy,
                        "createdOn": result[i].createdOn,
                        "companyId": result[i].companyId,
                        "accountId": result[i].accountId
                    };
                    dataArray.push(obj);
                }
            }

            res.json({
                result: dataArray,
                totalPages
            });
        })
        .catch((error) => {
            console.error("Error fetching contacts files:", error);
            res.status(500).json({ error: "An error occurred while fetching contacts files." });
        });
};



exports.getVisitingCardsFolderWise = (req, res) => {
    const companyId = req.body.companyId;
    const vfolderId = req.body.folderId;
    const page = req.body.page
    const limit = 10

    let pathName = req.body.pathData === 'root' ? '/' : req.body.pathData.toLowerCase();
    let itemArray = [];
    let companyContactsFolder = `${uploadFolder}/${companyId}/documents/contacts`;

    // Ensure the "contacts" folder exists for the given company
    if (!fs.existsSync(companyContactsFolder)) {
        fs.mkdirSync(companyContactsFolder, { recursive: true });
    }

    UploadRepositoryFile.find({
        isDeleted: false,
        companyId,
        vfolderId,
        path: "/contacts"
    })
    .populate("contactId", "title")
    .skip(limit*page).limit(limit)
        .then(async (result) => {

            console.log("resulttttt",result)

            const totalPages = Math.ceil(await UploadRepositoryFile.countDocuments({
                isDeleted: false,
                vfolderId,
        companyId,
        path: "/contacts"
            }) / limit)

            let folderPath = req.body.pathData === 'root'
                ? companyContactsFolder
                : `${companyContactsFolder}${pathName}`;

            // Get directories in the specified folderPath
            let dirs = fs.readdirSync(folderPath);

            // Only process directories under the "contacts" folder
            for (let x = 0; x < dirs.length; x++) {
                let a_dir = path.resolve(folderPath, dirs[x]);
                if (fs.statSync(a_dir).isDirectory()) {
                    itemArray.push(`/${dirs[x]}`);
                }
            }

            let dataArray = [];

            // Add directories under "contacts" to the dataArray
            for (let j = 0; j < itemArray.length; j++) {
                let name = itemArray[j].split('/');
                let pathDt = pathName === '/' ? itemArray[j] : `${pathName}${itemArray[j]}`;

                let obj = {
                    "title": name[1],
                    "path": pathDt,
                };
                dataArray.push(obj);
            }

            console.log("result", result)

            // Add files from the result that belong to the "contacts" folder
            for (let i = 0; i < result.length; i++) {
                if (result[i].path.toLowerCase().includes('/contacts')) {
                    let obj = {
                        "_id": result[i]._id,
                        "title": result[i].title || result[i].contactId?.title || "" ,
                        "fileName": result[i].fileName,
                        "description": result[i].description,
                        "path": result[i].path,
                        "isDeleted": result[i].isDeleted,
                        "createdBy": result[i].createdBy,
                        "createdOn": result[i].createdOn,
                        "companyId": result[i].companyId,
                        "accountId": result[i].accountId,
                        "vfolderId": result[i].vfolderId
                    };
                    dataArray.push(obj);
                }
            }

            res.json({
                result: dataArray,
                totalPages
            });
        })
        .catch((error) => {
            console.error("Error fetching contacts files:", error);
            res.status(500).json({ error: "An error occurred while fetching contacts files." });
        });
};




exports.getAllContactsFile = (req, res) => {
    const companyId = req.body.companyId;
    const page = req.body.page
    const limit = 10

    let pathName = req.body.pathData === 'root' ? '/' : req.body.pathData.toLowerCase();
    let itemArray = [];
    let companyContactsFolder = `${uploadFolder}/${companyId}/documents/contacts`;

    // Ensure the "contacts" folder exists for the given company
    if (!fs.existsSync(companyContactsFolder)) {
        fs.mkdirSync(companyContactsFolder, { recursive: true });
    }

    UploadRepositoryFile.find({
        isDeleted: false,
        companyId,
          path: "/contacts"
    }).skip(limit*page).limit(limit).populate("contactId")
        .then(async (result) => {

            const totalPages = Math.ceil(await UploadRepositoryFile.countDocuments({
                isDeleted: false,
        companyId,
        path: "/contacts"
            }) / limit)

            let folderPath = req.body.pathData === 'root'
                ? companyContactsFolder
                : `${companyContactsFolder}${pathName}`;

            // Get directories in the specified folderPath
            let dirs = fs.readdirSync(folderPath);

            // Only process directories under the "contacts" folder
            for (let x = 0; x < dirs.length; x++) {
                let a_dir = path.resolve(folderPath, dirs[x]);
                if (fs.statSync(a_dir).isDirectory()) {
                    itemArray.push(`/${dirs[x]}`);
                }
            }

            let dataArray = [];

            // Add directories under "contacts" to the dataArray
            for (let j = 0; j < itemArray.length; j++) {
                let name = itemArray[j].split('/');
                let pathDt = pathName === '/' ? itemArray[j] : `${pathName}${itemArray[j]}`;

                let obj = {
                    "title": name[1],
                    "path": pathDt,
                };
                dataArray.push(obj);
            }

            // Add files from the result that belong to the "contacts" folder
            for (let i = 0; i < result.length; i++) {
                if (result[i].path.toLowerCase().includes('/contacts')) {
                    let obj = {
                        "_id": result[i]._id,
                        "title": result[i].contactId?.title ||  result[i].title,
                        "fileName": result[i].fileName,
                        "description": result[i].description,
                        "path": result[i].path,
                        "isDeleted": result[i].isDeleted,
                        "createdBy": result[i].createdBy,
                        "createdOn": result[i].createdOn,
                        "companyId": result[i].companyId
                    };
                    dataArray.push(obj);
                }
            }

            res.json({
                result: dataArray,
                totalPages
            });
        })
        .catch((error) => {
            console.error("Error fetching contacts files:", error);
            res.status(500).json({ error: "An error occurred while fetching contacts files." });
        });
};


exports.getAllRepositoryFile = (req, res) => {
    const companyId = req.body.companyId;
    const page = req.body.page
    const limit = 10

    let pathName = req.body.pathData === 'root' ? '/' : req.body.pathData.toLowerCase();
    let itemArray = [];
    let companyDocumentFolder = uploadFolder + "/" + companyId + "/documents";
    if (
        !fs.existsSync(companyDocumentFolder)
    ) {
        fs.mkdirSync(companyDocumentFolder, { recursive: true })
    }


    UploadRepositoryFile.find({
        isDeleted: false,
        companyId,
        path : { $ne : '/contacts'}
    }).skip(limit*page).limit(limit)
        .then(async (result) => {

            const totalPages = Math.ceil(await UploadRepositoryFile.countDocuments({
                isDeleted: false,
                companyId,
                path : { $ne : '/contacts'}
            })/ limit)
            let folderPath = req.body.pathData === 'root' ? uploadFolder : uploadFolder + "/" + companyId + "/documents" + pathName;

            let dirs = fs.readdirSync(folderPath);

            for (let x = 0; x < dirs.length; x++) {
                let a_dir = path.resolve(folderPath, dirs[x]);

                if (dirs[x].toLowerCase() !== 'contacts' && fs.statSync(a_dir).isDirectory()) {
                    itemArray.push('/' + dirs[x]);
                }
            }

            let dataArray = [];

            for (let j = 0; j < itemArray.length; j++) {
                let name = itemArray[j].split('/');
                let pathDt = pathName === '/' ? itemArray[j] : pathName + itemArray[j];

                let obj = {
                    "title": name[1],
                    "path": pathDt,
                };
                dataArray.push(obj);
            }

            for (let i = 0; i < result.length; i++) {
                if (!result[i].path.toLowerCase().includes('/contacts')) {
                    let obj = {
                        "_id": result[i]._id,
                        "title": result[i].title,
                        "fileName": result[i].fileName,
                        "description": result[i].description,
                        "path": result[i].path,
                        "isDeleted": result[i].isDeleted,
                        "createdBy": result[i].createdBy,
                        "createdOn": result[i].createdOn,
                        "companyId": result[i].companyId
                    };
                    dataArray.push(obj);
                }
            }

            res.json({
                result: dataArray,
                totalPages
            });
        })
        .catch((error) => {
            console.error("Error fetching repository files:", error);
            res.status(500).json({ error: "An error occurred while fetching files." });
        });
};

exports.postMultipleVisitingCards = async (req, res) => {

    try{
        function ensureDirectoryExistence(filePath) {
            var dirname = path.dirname(filePath);
            if (fs.existsSync(dirname)) {
                return true;
            }
            ensureDirectoryExistence(dirname);
            fs.mkdirSync(dirname);
        }
    const companyId = req.body.companyId;
    console.log("give me data", req.body);
    console.log(req.files.files);
    const files = req.files.files.length ? req.files.files  : [req.files.files]


    if (!req.body.path) {
        return res.status(400).json({ error: "Path is required." });
    }
    let pathName;
    if (req.body.path === 'root') {
        pathName = '/'
    }
    else {
        if (req.body.path.charAt(0) === '/') {
            pathName = req.body.path
        }
        else {
            pathName = '/' + req.body.path
        }
    }


    if (!files.length) {
        res.send({ success: false, message: "No files were uploaded." });
        return;
    }

    let uploadFiles = []
     var companyFolderPath = uploadFolder + "/" + companyId + "/documents"
    
    let vFolder = await VFolder.findOne({name: req.body.folderName, companyId})

    if(!vFolder){
        vFolder = await VFolder.create({name: req.body.folderName, isDeleted:false, companyId, created_on: new Date()})
    }

    files.forEach((file)=>{
        const uploadFile = {
            title: req.body.title,
            fileName: file.name,
            description: req.body.description,
            path: pathName,
            isDeleted: false,
            createdBy: "",
            createdOn: new Date(),
            companyId: companyId,
            accountId: req.body.accountId || null,
            vfolderId: vFolder._id
        }
        uploadFiles.push(uploadFile)

       
        var filename = file.name;
        var uploadedFile = file;
        let fileUploaded = uploadedFile.name.split('.');
        let fileExtn = fileUploaded[fileUploaded.length - 1].toUpperCase();

        let validFileExtn = config.extentionFile;
        let isValidFileExtn = validFileExtn.filter((extn) => extn === fileExtn);

        
    ensureDirectoryExistence(companyFolderPath + pathName + "/" + filename)
    uploadedFile.mv(companyFolderPath + pathName + "/" + filename, function (err) {
        if (err) {
            console.log({ success: false, message: "File Not Saved." });
                }
            });

    })

    const uploadedVisitingCards = await UploadRepositoryFile.insertMany(uploadFiles)

    if(pathName == "/contacts"){
        const message = {accountId : req.body.accountId, vfolderId: vFolder._id,  companyId, files, filePath: companyFolderPath + pathName + "/", visitingCardsIds: uploadedVisitingCards.map((card)=>card._id) }
        sendMessageToQueue(message,
            "mul_contact_extraction_queue",
            "mul_contact_extraction_routing")
    }

    return res.json({success: true, message: "Visiting Cards Uploaded Successfully, Contacts will be created soon!"})

}catch(e){
    return res.json({success: false, message: "Failed uploading files"})
}



   
}

exports.postUploadFile = (req, res) => {
    const companyId = req.body.companyId;
    const type = req.body.type
    console.log("give me data", req.body);
    console.log(req.files);

    if (!req.body.path) {
        return res.status(400).json({ error: "Path is required." });
    }
    let pathName;
    if (req.body.path === 'root') {
        pathName = '/'
    }
    else {
        if (req.body.path.charAt(0) === '/') {
            pathName = req.body.path
        }
        else {
            pathName = '/' + req.body.path
        }
    }
    let uploadFile = new UploadRepositoryFile({
        _id: req.body._id,
        title: req.body.title,
        fileName: req.body.fileName,
        description: req.body.description,
        path: pathName,
        isDeleted: false,
        createdBy: "",
        createdOn: new Date(),
        companyId: companyId,
    })



    try {

        if (!req.files.uploadFile) {
            res.send({ success: false, message: "No files were uploaded." });
            return;
        }
        var companyFolderPath = uploadFolder + "/" + companyId + "/documents"
        var filename = req.body.fileName;
        var uploadedFile = req.files.uploadFile;
        let fileUploaded = uploadedFile.name.split('.');
        let fileExtn = fileUploaded[fileUploaded.length - 1].toUpperCase();

        let validFileExtn = config.extentionFile;
        let isValidFileExtn = validFileExtn.filter((extn) => extn === fileExtn);

        function ensureDirectoryExistence(filePath) {
            var dirname = path.dirname(filePath);
            if (fs.existsSync(dirname)) {
                return true;
            }
            ensureDirectoryExistence(dirname);
            fs.mkdirSync(dirname);
        }
        if (isValidFileExtn.length > 0) {
            uploadFile.save()
                .then((result) => {
                    res.json({
                        success: true,
                        message: `Document Added Successfully !`,
                        result: req.body
                    })
                })
            if (pathName === '/') {
                uploadedFile.mv(companyFolderPath + "/" + filename, function (err) {
                    if (err) {
                        console.log(err);
                        res.send({ success: false, message: "File Not Saved." });
                    }
                });
            }
            else {
                
                if(pathName == "/contacts"){
                    if (type.startsWith("image/")) {
                        const message = {accountId : req.body.accountId, filePath: companyFolderPath + pathName + "/" + filename, fileName: filename, companyId, type}
                        sendMessageToQueue(message,
                            "contact_extraction_queue",
                            "contact_extraction_routing")
                    }
                 
                }
                ensureDirectoryExistence(companyFolderPath + pathName + "/" + filename);

                uploadedFile.mv(companyFolderPath + pathName + "/" + filename, function (err) {
                    if (err) {
                        res.send({ success: false, message: "File Not Saved." });
                    }
                });
            }

        } else {
            res.send({ success: false, message: "File format not supported!(Formats supported are: 'PDF', 'DOCX', 'PNG', 'JPEG', 'JPG', 'TXT', 'PPT', 'XLSX', 'XLS','PPTX')" });
        }
    }
    catch (err) {
        console.log(err);
    }
}

exports.editRepositoryFile = ((req, res) => {
    console.log("req.body in edit global", req.body);
    
    
    let updatedFile = {
        _id: req.body._id,
        title: req.body.title,
        description: req.body.description
    }

    UploadRepositoryFile.findOneAndUpdate({ "_id": req.body._id }, updatedFile)
        .then((result) => {
            console.log("result", result);
            res.json({
                success: true,
                msg: `Document Updated Successfully!`,
                result: req.body
            })
        }) 
})




exports.deleteUploadFile = async (req, res) => {
    const companyId = req.body.companyId;
    console.log(req.body.updatedFile)
    const { fileName,  path: targetPath, _id } = req.body.updatedFile;

    console.log(targetPath, companyId)
    const fullPath = fileName
        ? path.join(uploadFolder,companyId, 'documents', targetPath, fileName)
        : path.join(uploadFolder,companyId, 'documents', targetPath);

        console.log(fullPath)

    try {

        if (_id) {
            await UploadRepositoryFile.findOneAndUpdate(
                { _id: _id },
                { $set: { isDeleted: true } }
            );
        }
        if (fileName) {
            await fs.promises.unlink(fullPath);
        } else {
            await fs.promises.rm(fullPath, { recursive: true, force: true });

            await UploadRepositoryFile.updateMany(
                { path: { $regex: `^${targetPath}` } },
                { $set: { isDeleted: true } }
            );
        }
        res.json({ success: true, message: "Successfully Deleted!" });
    } catch (err) {
        console.error("Deletion error:", err);
        res.status(500).json({ success: false, message: "Deletion failed." });
    }
};


exports.downloadUploadFile = ((req, res) => { // this routes all types of file
    // let userRole = req.userInfo.userRole.toLowerCase();
    // let accessCheck = access.checkEntitlementsForUserRole(userRole);
    // if (accessCheck === false) {
    //     res.json({ err: errors.NOT_AUTHORIZED });
    //     return;
    // }

    var data = req.body;
    if (data.path === '/') {
        var abpath = path.join(uploadFolder + "/", data.filename);
    }
    else {
        var abpath = path.join(uploadFolder + data.path + "/", data.filename);
    }

    res.download(abpath, (err) => {
        if (err) {
            console.log(err);
        }
    })

});



exports.createFolder = ((req, res) => {
    const companyId = req.body.companyId;
    console.log(companyId, "comm....")
    try {
        let pathName = '/' + req.body.folderPath.toLowerCase()

        if(pathName=="/contacts"){
            return res.json(
                {
                    success: false,
                    msg: `Folder name contacts cannot be created!`,
            
                }
            );
        }

        let companyFolderPath = uploadFolder + "/" + companyId + "/documents" + pathName;
        console.log(companyFolderPath, "folder...")

        let folder = {
            path: pathName
        }
        if (!fs.existsSync(companyFolderPath)) {
            fs.mkdirSync(companyFolderPath, { recursive: true });
            res.json(
                {
                    msg: `Successfully Created!`,
                    folder
                }
            );
        }
        return res.json({ success: true, message: "Folder created successful." })

    } catch (error) {

    }

});
