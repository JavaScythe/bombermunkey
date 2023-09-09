let clients = [];
let game = "menu";
let submenu = "";
let map = [];
let pmap = {};
const server = Bun.serve({
    fetch(req, server) {
        const success = server.upgrade(req);
        if (success) {
            return undefined;
        }
        return new Response(Bun.file("index.html"));
    },
    websocket: {
        async message(ws, message) {
            if(message.indexOf(":")!=-1){
                message = message.split(":");
                if(message[0] == "open" && message[1] == "none"){
                    console.log("new client: "+game);
                    let uuid = crypto.randomUUID();
                    let mode = "no";
                    if(clients.length == 0)mode = "yes";
                    ws.send("assign:"+uuid+":"+mode+":"+(game.replace(/\:/g, "%")));
                    ws.uuid = uuid;
                    clients.push({ws:ws,uuid:uuid});
                    if(game=="play"){
                        let enc = "";
                        for(let i=0;i<13;i++){
                            for(let k=0;k<11;k++){
                                enc+=map[i][k];
                            }
                        }
                        ws.send("map:"+enc);
                        enc = "";
                        for(let i in pmap){
                            for(let k in pmap[i]){
                                enc+=pmap[i][k]+":";
                            }
                        }
                        enc=enc.split("");
                        enc.pop();
                        enc=enc.join("");
                        ws.send("entity:"+enc.replace(/\:/g, "%"));
                        if(clients.length-1<4){
                            ws.send("who:p"+(clients.length-1));
                            ws.person = "p"+(clients.length-1);
                        } else {
                            ws.send("who:spec");
                            ws.person = "spec";
                        }
                    }
                } else if(message[0] == "key"){
                    if(message[1]=="enter"&&game=="menu"){
                        game="submenu:top:0:on:on:off:off:3:1";
                    } else if(message[1]=="enter"&&game.split(":")[0]=="submenu"){
                        submenu=game;
                        game="play";
                        let enc = generateMap();
                        clients.forEach(c => {
                            c.ws.send("map:"+enc);
                        });
                        enc = "0:0:1:12:0:1:12:10:1:0:10:1";
                        for(let b=0;b<12;b+=3){
                            pmap["p"+(b/3)] = {
                                x: enc.split(":")[b],
                                y: enc.split(":")[b+1],
                                b: enc.split(":")[b+2]
                            }
                        };
                        for(let k in clients){
                            clients[k].ws.send("entity:"+enc.replace(/\:/g, "%"));
                            if(k<4){
                                clients[k].ws.send("who:p"+k);
                                clients[k].ws.person = "p"+k;
                            } else {
                                clients[k].ws.send("who:spec");
                                clients[k].ws.person = "spec";
                            }
                        }
                    }
                    if(game.split(":")[0]=="submenu" && message[1]=="down"){
                        let state = game.split(":");
                        if(state[2]==3){
                            state[1] = "bottom";
                            state[2] = parseInt(state[2])+1;
                            game=state.join(":");
                        }else if(state[2]==5){
                            //ignnore
                        } else if(state[2]!=3){
                            state[2] = parseInt(state[2])+1;
                            game=state.join(":");
                        }
                    } else if(game.split(":")[0]=="submenu" && message[1]=="up"){
                        let state = game.split(":");
                        if(state[2]==4){
                            state[1] = "top";
                            state[2] = parseInt(state[2])-1;
                            game=state.join(":");
                        } else if(state[2]!=0){
                            state[2] = parseInt(state[2])-1;
                            game=state.join(":");
                        }
                    } else if(game.split(":")[0]=="submenu" && message[1]=="left"){
                        let state = game.split(":");
                        if(state[2]==5){
                            if(state[parseInt(state[2])+3] == 1){
                                state[parseInt(state[2])+3] = 5;
                                game=state.join(":");
                            } else {
                                state[parseInt(state[2])+3] = parseInt(state[parseInt(state[2])+3])-1;
                                game=state.join(":");   
                            }
                        } else {
                            if(state[parseInt(state[2])+3] == "on"){
                                state[parseInt(state[2])+3] = "off";
                            } else {
                                state[parseInt(state[2])+3] = "on";
                            }
                            game=state.join(":");
                        }
                    } else if(game.split(":")[0]=="submenu" && message[1]=="right"){
                        let state = game.split(":");
                        if(state[2]==5){
                            if(state[parseInt(state[2])+3] == 5){
                                state[parseInt(state[2])+3] = 1;
                                game=state.join(":");
                            } else {
                                state[parseInt(state[2])+3] = parseInt(state[parseInt(state[2])+3])+1;
                                game=state.join(":");   
                            }
                        } else {
                            if(state[parseInt(state[2])+3] == "on"){
                                state[parseInt(state[2])+3] = "off";
                            } else {
                                state[parseInt(state[2])+3] = "on";
                            }
                            game=state.join(":");
                        }
                    }
                    if(game=="play" && message[1] == "left"){
                        if(ws.person!="spec"&&ws.person!=undefined&&ws.person[0]=="p"){
                            console.log(ws.person);
                            pmap[ws.person].x -= 1;
                        }
                    }
                    clients.forEach(c => {
                        if(c.uuid!=ws.uuid){
                            if(["p0","p1","p2","p3"].indexOf(ws.person) != -1){
                                c.ws.send("key:"+message[1]+":"+ws.person);
                            } else {
                                c.ws.send("key:"+message[1]);
                            }
                        }
                    });
                }
            }
            console.log(`Received ${message}`);
        },
        close(ws) {
            for(let i in clients){if(clients[i].uuid == ws.uuid){clients.splice(i,1);break;}};
            if(clients.length == 0)game="menu";
        }
    },
    port: 3001
});
function generateMap(t){
    let enc = "";
    for(let i=0;i<13;i++){
        map.push([]);
        for(let k=0;k<11;k++){
            if(
                (i==0&&k==0)  ||
                (i==0&&k==1)  ||
                (i==1&&k==0)  || 
                (i==12&&k==0) ||
                (i==11&&k==0) ||
                (i==12&&k==1) ||
                (i==0&&k==10) ||
                (i==0&&k==9)  ||
                (i==1&&k==10) ||
                (i==12&&k==10)||
                (i==12&&k==9) ||
                (i==11&&k==10)
            ){
                map[map.length-1].push(0);
            } else {
                map[map.length-1].push(Math.round(Math.random()));
            }
            enc+=map[map.length-1][map[map.length-1].length-1];
        }
    }
    return enc;
}
console.log(`Listening on localhost:${server.port}`);