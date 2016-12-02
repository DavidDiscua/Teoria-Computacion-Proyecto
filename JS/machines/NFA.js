function NFAtoDFA() {        
    var trans = getTransition();
    var init = getInitialNode();
    var fin = getFinalNodes();
    console.log(trans);
    console.log(init);
    console.log(fin)
    $("#vizGraphBefore").html(drawGraph(init, trans, fin));
    $("#vizGraphAfter").html(drawGraph(init, trans, fin));
    $("#vizModal").modal();
};  

function consumeStringNFA(){  
    if(validateAutomataEstructure()){
        $('#str_validate').text('NFA definido'); 
        var stringToConsume = $('#str_cadena').val();
        console.log(getInitialNode().idNext);
        var nodeAns = recursiveConsume(getTransition(),getInitialNode().idNext,0,stringToConsume.length,stringToConsume);
        console.log(nodeAns)
        if(nodeAns){
            if(nodeAns.actualPos == stringToConsume.length && nodeAns.node.isAcceptState){
                swal("Nice!", "Cadena Aceptada", "success");
            }else{
                   swal("Opps", "Cadena Rechazada", "error");
            }
        }else{
            swal("Opps", "Cadena Rechazada", "error");
        }
        

        $('#str_cadena').val('');
    }
};


function recursiveConsume(Transitions, NextNode, ActualPosString, LengthString, StringToConsume){
    if(ActualPosString == LengthString && Transitions[NextNode].node.isAcceptState){
        var ans = {
            'actualPos': ActualPosString,
            'node': Transitions[NextNode].node
        }
        return ans;
    }
    for(var i = 0; i < Transitions[NextNode].links.length; i++){
        if(Transitions[NextNode].links[i].symbol === StringToConsume.charAt(ActualPosString)){
            var t = recursiveConsume(Transitions, Transitions[NextNode].links[i].node.idNext, ActualPosString+1, LengthString, StringToConsume);
            if(t){
                if(t.actualPos == LengthString){
                    return t
                }
            }
            
        }else if(Transitions[NextNode].links[i].symbol === '#'){
            var t = recursiveConsume(Transitions, Transitions[NextNode].links[i].node.idNext, ActualPosString, LengthString, StringToConsume);
            if(t){
                if(t.actualPos == LengthString){
                    return t
                }
            }
        }
    }
}



function NFAtoDFA(){
    var Transitions=getTransition();
    var InitialNode=getInitialNode();
    var FinalNodes  =getFinalNodes();
    var Nodes = getNodes();
    var NewStates = CreateDFAStates(Nodes);
    var StatesSpliter = null;
    var Alphabet = getAlphabet(Transitions);
    var ENode= new Array;
    var idNode=0;
    var newTransitions= new Array;
    var newFinalNodes = getNewFinalNodes(NewStates,FinalNodes);
    var newInitialNode= getNewInitialNode(Transitions,InitialNode,Nodes,NewStates);
    for(var i=0; i<NewStates.length;i++){
        console.log("State: : "+NewStates[i].text);
        StatesSpliter=NewStates[i].text.split(",");
        var tempLinks= new Array;
        for(var k=0; k<Alphabet.length;k++){  
            console.log("Con : "+Alphabet[k]);
            var NodeDeltaUEnode = new Array;            
            for(var j=0; j<StatesSpliter.length;j++){
                //console.log("Con parte de nodo : "+StatesSpliter[j]);             
                var DeltaReturn=(FindDelta(Transitions,StatesSpliter[j],Alphabet[k]));                  
                if(DeltaReturn){
                    for(var x=0; x<DeltaReturn.length;x++){
                        NodeDeltaUEnode.push(DeltaReturn[x]);
                        idNode=DeltaReturn[x].idNext;
                        ENode=NoDuplicates(recursiveFindE(Transitions,Nodes[idNode],idNode,ENode,Nodes[idNode]));
                        if(ENode){
                            NodeDeltaUEnode=addEnodes(NodeDeltaUEnode,ENode);    
                        }
                    }
                                  
                }              
            }
           //Create Temp link
            NodeDeltaUEnode=NoDuplicates(NodeDeltaUEnode);
            tempLinks.push({'symbol': Alphabet[k],'node': findNode(NewStates,createSet(NodeDeltaUEnode))});
            console.log("============================TEMP LINKS=================================");
            console.log(tempLinks); 
        }
        //create Transition
        if(tempLinks.length>0){
            newTransitions.push({'links':tempLinks,'node': NewStates[i]});

        }
       
    }
    console.log("==================================================");
    console.log(InitialNode);
    console.log(FinalNodes);
    console.log(Transitions);
    console.log("====================================================");
    console.log(newInitialNode);
    console.log(newFinalNodes);
    console.log(newTransitions);    
    $("#vizGraphBefore").html(drawGraph(InitialNode, Transitions, FinalNodes));
    $("#vizGraphAfter").html(drawGraph(newInitialNode, newTransitions, newFinalNodes));
    $("#vizModal").modal();
 
};


function addEnodes(NodeDeltaUEnode,ENode){
    for(var i=0; i<ENode.length;i++){
        if(!arrayContains(ENode[i],NodeDeltaUEnode)){
            NodeDeltaUEnode.push(ENode[i]);
        }
    }    
    return NodeDeltaUEnode;
};

function createSet(Array){
    var set="";
    for(var i=0; i<Array.length;i++){
        set+=Array[i].text+",";
    }
    set=set.slice(0, -1);
    return set;

};


function getNewInitialNode(Transitions,Node,Nodes,NewStates){
    var ENode = new Array;
    var NodeDeltaUEnode=new Array;
    NodeDeltaUEnode.push(Node);
    var idNode=Node.idNext;
    ENode=NoDuplicates(recursiveFindE(Transitions,Nodes[idNode],idNode,ENode,Nodes[idNode]));
    if(ENode){
        NodeDeltaUEnode=addEnodes(NodeDeltaUEnode,ENode);  
        NodeDeltaUEnode=NoDuplicates(NodeDeltaUEnode);
        return findNode(NewStates,createSet(NodeDeltaUEnode));  
    }
    return null;
};

function getNewFinalNodes(NewStates,Nodes){
    var newFinalNodes= new Array;
    for(var i=0;i<NewStates.length;i++){
        for(var j =0; j<Nodes.length;j++){
            if(NewStates[i].text.includes(Nodes[j].text)){
                NewStates[i].isAcceptState=true;
                newFinalNodes.push(NewStates[i]);
            }
        }

    }

    return newFinalNodes;
};

function findNodeID(Nodes,Node){

    for(var i=0; i<Nodes.length;i++){
        if(Nodes[i].text===Node){
            return Nodes[i].idNext;
        }

    }     
    return null;
};

function findNode(Nodes,Node){
    var split=Node.split(",");;
    var counter =0;
    console.log("NODE TO FIND: "+Node);
    for(var i=0; i<Nodes.length;i++){
        for(var j=0; j<split.length;j++){
            if(Nodes[i].text.includes(split[j])){
                counter++;
            }   

        }
        if(counter==(Node.length-split.length+1)&&Node.length==Nodes[i].text.length){
            return Nodes[i];
        }
        counter =0;     
    }     
    return Nodes[Nodes.length-1];    

};


function getAlphabet(Transitions){
    var Alphabet = new Array;
    var Symbol="";
    for(var i=0; i<Transitions.length;i++){
        for(var j=0; j<Transitions[i].links.length;j++){
            Symbol=Transitions[i].links[j].symbol;
            if(!arrayContains(Symbol,Alphabet)&&Symbol!="#"){
                Alphabet.push(Symbol);
            }
        }

    }
    return Alphabet;

};

function FindDelta(Transitions,Node,Symbol){
    var NodesToPush = new Array;
    for(var i=0; i<Transitions.length;i++){
        if(Transitions[i].node.text==Node){
           for(var j=0; j<Transitions[i].links.length;j++){
                    if(Transitions[i].links[j].symbol==Symbol){
                        NodesToPush.push(Transitions[i].links[j].node);
                    }          
                    
                }
          }
    }
    return NodesToPush;

};

function CreateDFAStates(Nodes){
    var NewStates = new Array;
    var justText= new Array;
    var allStates="";
    var toAdd=null;
    var toAddInverse=null;
    for(var i=0; i <Nodes.length ;i++){
        for(var j=1; j<Nodes.length;j++){
            toAdd= new Node(0,0,0);
            toAddInverse=new Node(0,0,0);
            toAdd.setText(Nodes[i].text+","+Nodes[j].text);
            toAddInverse.setText(Nodes[j].text+","+Nodes[i].text);
            if(!(arrayContains(toAdd.getText(),justText))&& !(arrayContains(toAddInverse.getText(),justText)) &&(Nodes[j].text!=Nodes[i].text)){
                justText.push(toAdd.getText());
                NewStates.push(toAdd);

            }
        }
        allStates+=Nodes[i].text+",";
        NewStates.push(Nodes[i]);
    }

    allStates=allStates.slice(0, -1);
    toAdd= new Node(0,0,0);
    toAdd.setText(allStates);   
    if(!arrayContains(toAdd.getText(),justText)&& justText.length>1){
        NewStates.push(toAdd);

    }
    toAdd= new Node(0,0,0);
    toAdd.setText("Ø");
    NewStates.push(toAdd);
    return NewStates;
};


function recursiveFindE(Transitions, Node,NextNode, ArrayE,InitialNode){
   
    for(var i=0; i<Transitions[NextNode].links.length;i++){
        if(Transitions[NextNode].node.text==Node.text){
            if(Transitions[NextNode].links[i].symbol=="#"){//found Epsilon
                ArrayE.push(Transitions[Transitions[NextNode].links[i].node.idNext].node);
                var SaveStates= recursiveFindE(Transitions, Transitions[Transitions[NextNode].links[i].node.idNext].node,Transitions[NextNode].links[i].node.idNext, ArrayE);
                if(SaveStates!=null){
                    return SaveStates;
                }

            }else{
               // console.log("Not Found Epsilon so Keep Looking in this node");

            }

        } 
    }
    if(Transitions[NextNode].node==InitialNode){
        return ArrayE;
    }
     
};
