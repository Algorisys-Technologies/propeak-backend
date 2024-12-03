const validateEntitlements = (accessRights, projectId, group, entitlementId, userRole) => {
    let value = false;
    if(accessRights !== null && accessRights !== undefined && accessRights.length > 0) {
        
        let projectAccessRights = accessRights.filter((a) => {
            return a.projectId === projectId;
        })
        if(projectAccessRights.length > 0){
            for(let i=0;i<projectAccessRights.length;i++){
                if( projectAccessRights[i].group === group && projectAccessRights[i].entitlementId === entitlementId){
                    value = true;
                    break;
                }
            }
        } else {
            if(userRole !== 'user'){
                value = true;
            }
        }
    }
    return value;
}

module.exports=accessConfig={validateEntitlements}