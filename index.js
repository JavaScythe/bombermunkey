let clients = [];
let game = "menu";
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
                    console.log("new client");
                    let uuid = crypto.randomUUID();
                    let mode = "no";
                    if(clients.length == 0)mode = "yes";
                    ws.send("assign:"+uuid+":"+mode+":"+(game.replace(/\:/g, "%")));
                    ws.uuid = uuid;
                    clients.push({ws:ws,uuid:uuid});
                } else if(message[0] == "key"){
                    if(message[1]=="enter"&&game=="menu"){
                        game="submenu:top:0:on:on:off:off:3:1";
                    } else if(message[1]=="enter"&&game.split(":")[0]=="submenu"){
                        game="play";
                    }
                    if(game.split(":")[0]=="submenu" && message[1]=="down"){
                        let state = game.split(":");
                        if(state[2]==3){
                            state[1] = "bottom";
                            state[2] = parseInt(state[2])+1;
                            game=state.join(":");
                        }else if(state[2]!=3){
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
                    clients.forEach(c => {
                        if(c.uuid!=ws.uuid)c.ws.send("key:"+message[1]);
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
});
console.log(`Listening on localhost:${server.port}`);