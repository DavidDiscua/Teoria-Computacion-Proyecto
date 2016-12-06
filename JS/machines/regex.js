function verifyRegex(){
    var str_regex = new RegExp($('#str_regex').val());
    var str_cadena = $('#str_cadena').val();
    if(str_regex.test(str_cadena)){
    	swal("Nice!", "Cadena Aceptada", "success");
    	$('#str_cadena').val('');
    }else{
    	swal("Opps", "Cadena Rechazada", "error");
    }

}

function regexToDFA(){
	
}

function regexToNFA(){
    
	var str_regex = $('#str_regex').val();
	if(str_regex){
		
		var nfa = RegexParser.parse(str_regex);
		for (var state in nfa.states) {
		  console.group(state);
		  for (var transition in nfa.states[state].transitions) {
			var destinations = nfa.states[state].transitions[transition].map(function(item) {
			  return item.label;
			}).join(', ');
			console.log(transition + ' : ' + destinations);
		  }
		  if (nfa.states[state].final) {
			console.log('-- final state');
		  }
		  console.groupEnd();
		}
		
		
		
	}else{
		vizText = "digraph g { a -> b; }";
		$('#modal_Title2').text('DFA');
        $("#vizGraphBefore").html(Viz(vizText, { format: "svg" }));
        $("#vizModal").modal();
	}
}