function consumeStringDFA(){    
    var stringToConsume = $('#cadena').val();
	var isAccepted = recursiveConsumeDFA(getTransition(),getInitialNode().id,0,stringToConsume.length,stringToConsume,0);
	if(isAccepted){
		if(isAccepted.isAcceptState){
			alert("Aceptada");
		}else{
			alert("Rechazada");
		}
	}else{
			alert("Rechazada");
	}
};

var recursiveConsumeDFA = function(Transitions, NextNode, ActualPosString, LengthString, StringToConsume, LinkPos){
    if(ActualPosString === LengthString){
        return Transitions[NextNode].node;
    }else{
        if(Transitions[NextNode].links[LinkPos].symbol === StringToConsume.charAt(ActualPosString)){
            return recursiveConsume(Transitions, Transitions[NextNode].links[LinkPos].node.id,ActualPosString+=1,LengthString,StringToConsume,0);
        }else{
            if(LinkPos >= Transitions[NextNode].links.length){
                return recursiveConsume(Transitions, NextNode, LengthString, LengthString, StringToConsume,LinkPos );
            }else{
                return recursiveConsume(Transitions, NextNode, ActualPosString, LengthString, StringToConsume, LinkPos+=1);
            }
        }
    }
}