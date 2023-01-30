//we want minimist
//we want axios
//we want jsdom
//we want excel4node
//we want pdf-lib
//use getElementsByClassName() instead of querySelectorAll, dont know the issue, but it fixed
/*
node worldcupextractor.js --excel=worldcup.csv --dataFolder=world_cup_data --source="https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-schedule-fixtures-and-results" 
*/
let minimist = require("minimist");
let fs = require("fs");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let path = require("path");
let args = minimist(process.argv);
let responsekapromise = axios.get(args.source);
responsekapromise.then(function(response){
    let teams = [];
    let matches = [];
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
    let matchInfodivs = document.getElementsByClassName("ds-grow ds-px-4 ds-border-r ds-border-line-default-translucent");
    for(let i = 0; i<matchInfodivs.length; i++){
        let match = {};
        let team1 = matchInfodivs[i].getElementsByClassName("ds-flex ds-items-center ds-min-w-0 ds-mr-1")[0].querySelector("p").textContent;
        let team2 = matchInfodivs[i].getElementsByClassName("ds-flex ds-items-center ds-min-w-0 ds-mr-1")[1].querySelector("p").textContent;
        let result = matchInfodivs[i].getElementsByClassName("ds-text-tight-s ds-font-regular ds-line-clamp-2 ds-text-typo")[0].querySelector("span").textContent;
        match.team1 = team1;
        match.team2 = team2;
        match.result = result;
        match.team1Score = "";
        match.team2Score = "";
        let team1Score = matchInfodivs[i].querySelectorAll("strong")[0];
        let team2Score = matchInfodivs[i].querySelectorAll("strong")[1];
        if(team1Score!=null){
            match.team1Score = team1Score.textContent;
        }
        if(team2Score!=null){
            match.team2Score = team2Score.textContent;
        }
        /*********** HERE WE MADE AN ARRAY FOR EACH TEAM (i.e) INDIA, AUSTRALIA, ENGLAND, WEST INDIES, ETC */
        matches.push(match);
        let t1idx = teams.findIndex(function(team){
            if(team.name === match.team1){
                return true;
            }
            return false;
        });
        if(t1idx === -1){
            let obj = {
                name : match.team1,
                matchTeams : []
            };
            teams.push(obj);
        }
        let t2idx = teams.findIndex(function(team){
            if(team.name === match.team2){
                return true;
            }
            return false;
        });
        if(t2idx === -1){
            let obj = {
                name : match.team2,
                matchTeams : []
            };
            teams.push(obj);
        }
    }
    for(let i = 0; i<matches.length; i++){
        PutMatchesInAppropriateTeams(teams, matches[i]);
    }
    let teamsJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsJSON, "utf-8");
    /***************************************************************************************** */
   
   
   
    /*******************     MAKING EXCEL SHEET FOR EACH TEAM         *************/
    let wb = new excel.Workbook();
    for(let i = 0; i<teams.length; i++){
        let sheet = wb.addWorksheet(teams[i].name);
        sheet.cell(1, 1).string("Opponent");
        sheet.cell(1, 2).string(teams[i].name + "Score");
        sheet.cell(1, 3).string("Opponent Score");
        sheet.cell(1, 4).string("Result");
        for(let j = 0; j<teams[i].matchTeams.length; j++){
            let vs = teams[i].matchTeams[j].vs;
            let result = teams[i].matchTeams[j].result;
            let selfscore = teams[i].matchTeams[j].selfscore;
            let opposcore = teams[i].matchTeams[j].oppscore;
            sheet.cell(2 + j, 1).string(vs);
            sheet.cell(2 + j, 2).string(selfscore);
            sheet.cell(2 + j, 3).string(opposcore);
            sheet.cell(2 + j, 4).string(result);
        }
    };
    wb.write(args.excel);
    /******************************************************************************* */
    
    
    
    /*************************CREATE A FOLDER WORLD_CUP_DATA AND CREATE PDFS FOR EACH TEAM */
    
    
    fs.mkdirSync(args.dataFolder); //pehle toh world_cup_data ka folder bana 
    //manually bhi kar sakte hai, no worries



    for(let i = 0; i<teams.length; i++){
        let teamFolder = path.join(args.dataFolder, teams[i].name); // iss folder me jaakar pdf banani hai
        fs.mkdirSync(teamFolder);
        for(let j = 0; j<teams[i].matchTeams.length; j++){



            //let filename = path.join(teamFolder, teams[i].matchTeams[j].vs + ".pdf"); //extension manually dena padhta hai
            //^^ yeh upar humne "country" ka naam se pdf banaya

            createScore(teams[i].name, teams[i].matchTeams[j], teamFolder);
            //fs.writeFileSync(filename, "", "utf-8");
            
        }
    }
    /********************************************************************************* */
    
    
    
    /***************** TO WRITE IN PDF FILES *****************/
    function createScore(name, match, teamFolder){
    let filename = path.join(teamFolder, match.vs);
    let team1 = name;
    let team2 = match.vs;
    let team1Score = match.selfscore;
    let team2Score = match.oppscore;
    let result = match.result;
    let originaltemplate = fs.readFileSync("template.pdf"); //mujhe isse template.pdf ke bytes aa jayenge
    let promise2load = pdf.PDFDocument.load(originaltemplate); //.load is a promise
    promise2load.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);
        page.drawText(team1, {
            x : 320,
            y : 670,
            size: 20
        });
        page.drawText(team2, {
            x : 320,
            y : 645,
            size: 20
        });
        page.drawText(team1Score, {
            x : 320,
            y : 620,
            size: 20
        });
        page.drawText(team2Score, {
            x : 320,
            y : 590,
            size: 20
        });
        page.drawText(result, {
            x : 300,
            y : 560,
            size: 10
        });
        let promise2save = pdfdoc.save(); //.save is a promise
        promise2save.then(function(changesBytes){
            if(fs.existsSync(filename + ".pdf") == true){
                fs.writeFileSync(filename + "1.pdf", changesBytes);
            }
            else{
                fs.writeFileSync(filename + ".pdf", changesBytes);
            }
        })
    })
    }
    /************************************************************************************** */
    
    
    
    
    /*************************** FUNCTION TO MAKE TEAMS ARRAY OF OBJECTS ********/
    function PutMatchesInAppropriateTeams(teams, match){
        let idx1 = 0;
        for(let i = 0; i<teams.length; i++){
            if(teams[i].name === match.team1){
                idx1 = i;
                break;
            }
        }
        teams[idx1].matchTeams.push({
            vs:match.team2,
            selfscore:match.team1Score,
            oppscore:match.team2Score,
            result:match.result
        });
        let idx2 = 0;
        for(let i = 0; i<teams.length; i++){
            if(teams[i].name === match.team2){
                idx2 = i;
                break;
            }
        }
        teams[idx2].matchTeams.push({
            vs:match.team1,
            selfscore:match.team2Score,
            oppscore:match.team1Score,
            result:match.result
        });
    }
    /***************************************************************/
    
});
