var CFG = {};
var rABS = typeof FileReader !== "undefined" && typeof FileReader.prototype !== "undefined" && typeof FileReader.prototype.readAsBinaryString !== "undefined";
if(!rABS) {
	document.getElementsByName("userabs")[0].disabled = true;
	document.getElementsByName("userabs")[0].checked = false;
}

var use_worker = typeof Worker !== 'undefined';
if(!use_worker) {
	document.getElementsByName("useworker")[0].disabled = true;
	document.getElementsByName("useworker")[0].checked = false;
}

var transferable = use_worker;
if(!transferable) {
	document.getElementsByName("xferable")[0].disabled = true;
	document.getElementsByName("xferable")[0].checked = false;
}

var wtf_mode = false;

function fixdata(data) {
	var o = "", l = 0, w = 10240;
	for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint8Array(data.slice(l*w,l*w+w)));
	o+=String.fromCharCode.apply(null, new Uint8Array(data.slice(l*w)));
	return o;
}

function ab2str(data) {
	var o = "", l = 0, w = 10240;
	for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint16Array(data.slice(l*w,l*w+w)));
	o+=String.fromCharCode.apply(null, new Uint16Array(data.slice(l*w)));
	return o;
}

function s2ab(s) {
	var b = new ArrayBuffer(s.length*2), v = new Uint16Array(b);
	for (var i=0; i != s.length; ++i) v[i] = s.charCodeAt(i);
	return [v, b];
}

function xlsxworker_noxfer(data, cb) {
	var worker = new Worker('./xlsxworker.js');
	worker.onmessage = function(e) {
		switch(e.data.t) {
			case 'ready': break;
			case 'e': console.error(e.data.d); break;
			case 'xlsx': cb(JSON.parse(e.data.d)); break;
		}
	};
	var arr = rABS ? data : btoa(fixdata(data));
	worker.postMessage({d:arr,b:rABS});
}

function xlsxworker_xfer(data, cb) {
	var worker = new Worker(rABS ? 'js/xlsxworker2.js' : './xlsxworker1.js');
	worker.onmessage = function(e) {
		switch(e.data.t) {
			case 'ready': break;
			case 'e': console.error(e.data.d); break;
			default: xx=ab2str(e.data).replace(/\n/g,"\\n").replace(/\r/g,"\\r"); console.log("done"); cb(JSON.parse(xx)); break;
		}
	};
	if(rABS) {
		var val = s2ab(data);
		worker.postMessage(val[1], [val[1]]);
	} else {
		worker.postMessage(data, [data]);
	}
}

function xlsxworker(data, cb) {
	transferable = document.getElementsByName("xferable")[0].checked;
	if(transferable) xlsxworker_xfer(data, cb);
	else xlsxworker_noxfer(data, cb);
}

function get_radio_value( radioName ) {
	var radios = document.getElementsByName( radioName );
	for( var i = 0; i < radios.length; i++ ) {
		if( radios[i].checked || radios.length === 1 ) {
			return radios[i].value;
		}
	}
}

function to_json(workbook) {
	var result = {};
	workbook.SheetNames.forEach(function(sheetName) {
		var roa = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
		if(roa.length > 0){
			result[sheetName] = roa;
		}
	});
	return result;
}


var drop = document.getElementById('drop');
function handleDrop(e) {
	e.stopPropagation();
	e.preventDefault();
	rABS = document.getElementsByName("userabs")[0].checked;
	use_worker = document.getElementsByName("useworker")[0].checked;
	var files = e.dataTransfer.files;
	var i,f;
	for (i = 0, f = files[i]; i != files.length; ++i) {
		var reader = new FileReader();
		var name = f.name;
    CFG['filename'] = name;
		reader.onload = function(e) {
			if(typeof console !== 'undefined') console.log("onload", new Date(), rABS, use_worker);
			var data = e.target.result;
			if(use_worker) {
				xlsxworker(data, process_wb);
			} else {
				var wb;
				if(rABS) {
					wb = XLSX.read(data, {type: 'binary'});
				} else {
				var arr = fixdata(data);
					wb = XLSX.read(btoa(arr), {type: 'base64'});
				}
				process_wb(wb);
			}
		};
		if(rABS) reader.readAsBinaryString(f);
		else reader.readAsArrayBuffer(f);
	}
}

function handleDragover(e) {
	e.stopPropagation();
	e.preventDefault();
	e.dataTransfer.dropEffect = 'copy';
}

if(drop.addEventListener) {
	drop.addEventListener('dragenter', handleDragover, false);
	drop.addEventListener('dragover', handleDragover, false);
	drop.addEventListener('drop', handleDrop, false);
}


var xlf = document.getElementById('xlf');
function handleFile(e) {
	rABS = document.getElementsByName("userabs")[0].checked;
	use_worker = document.getElementsByName("useworker")[0].checked;
	var files = e.target.files;
	var i,f;
	for (i = 0, f = files[i]; i != files.length; ++i) {
		var reader = new FileReader();
		var name = f.name;
    CFG['filename'] = name;
		reader.onload = function(e) {
			if(typeof console !== 'undefined') console.log("onload", new Date(), rABS, use_worker);
			var data = e.target.result;
			if(use_worker) {
				xlsxworker(data, process_wb);
			} else {
				var wb;
				if(rABS) {
					wb = XLSX.read(data, {type: 'binary'});
				} else {
				var arr = fixdata(data);
					wb = XLSX.read(btoa(arr), {type: 'base64'});
				}
				process_wb(wb);
			}
		};
		if(rABS) reader.readAsBinaryString(f);
		else reader.readAsArrayBuffer(f);
	}
}

/* helper function to clean taxon names and make them newick compatible */
function clean_taxa(taxon) {

  return taxon.replace(/ /g,'_').replace('(','').replace(')','');
}

/* save file */
function saveData()
{
  var blob = new Blob([CFG['data']], {type: 'text/plain;charset=utf-8'});
  saveAs(blob, CFG['filename'].replace('.xlsx','.qlc'));
}


function process_starling(json) {
  /* check for sheet, take the first */
  var json_keys = Object.keys(json);
  if (json_keys.length == 1) {
    var sheet = json_keys[0];
  }
  else {
    var sheet = json_keys[0];
  }
  
  /* get taxa */
  var taxa = [];
  var proto = '';
	var varia = [];
  /* determine names with numbers first */
  for (key in json[sheet][0]) {
    if (key.indexOf('#') == key.length -1 && key.toLowerCase().indexOf('proto') != -1) {
      proto = key.slice(0,key.length -2);
    }
    else if (key.indexOf('#') == key.length -1) {
      taxa.push(key.slice(0,key.length -2))  
    }			
  }

	for (key in json[sheet][0]) {
		if (key.toUpperCase() != 'NUMBER' && key.indexOf('#') == -1 && taxa.indexOf(key) == -1 && key.toUpperCase() != '__ROWNUM__' && key.toUpperCase() != 'WORD') {
			varia.push(key);
		}
	}
  
  var table =[["ID",'TAXA','GLOSS','GLOSSID','ORIGINALGLOSS','STARLING','ORTHOGRAPHY',"IPA","COGID","PROTO"]];
	for (var i=0,varium; varium=varia[i]; i++) {
		table[0].push(varium);
	}
  var cognate_counter = 0;
  var current_gloss = '';
  var idx = 1;
  var cognate_sets = [];
  var keys = [0];
  for (var i=1,line; line=json['Sheet1'][i]; i++) {
    var original_gloss = line['Word'];
    var num = line['Number'];
    var gloss = TOB[num];
    var proto_form = line[proto];
    var proto_num = line[proto+' #'];
    if(typeof proto_form == 'undefined') {
      proto_form = '?';
      proto_num = '?';
    }
    else {
      proto_num = parseInt(proto_num);
      if(proto_num <= 0) {
        proto_num = '??';
      }
    }
    console.log(gloss, num, proto_form, proto_num);

    if (typeof gloss == 'undefined') {
      gloss = original_gloss;
    }
    for (var j=0,taxon; taxon = taxa[j]; j++) {
      var word = line[taxon];
      var cogid = parseInt(line[taxon+' #'].replace(/\s/g,''));
      if (cogid != 0 && typeof word != 'undefined') {
        console.log("cogid",gloss,cogid,cognate_counter)
        if (word.replace(/\s/g,'') != '') {
          if (gloss != current_gloss) {
            cognate_counter += cognate_sets.length;
            cognate_sets = [];
            current_gloss = gloss;
            proto_num += cognate_counter;
          }
          
          var bidx = word.indexOf('{');
          if (bidx != -1) {
            var ipa = word.slice(0,bidx);
            var ort = word.slice(bidx+1,word.length-2);
          }
          else {
            var ipa = word;
            var ort = word;
          }
        
          /* take only first element of IPA */
          ipa = ipa.split(' ~ ')[0];
          ipa = ipa.replace(/[-\s]\s*$/,'');
          ipa = ipa.replace(/-/g,'+');
          ipa = ipa.replace('=','');
          ipa = ipa.replace(/ /g,'_') 

          if(cogid > 0) {
            cogid = parseInt(cognate_counter) + parseInt(cogid);
            if (cognate_sets.indexOf(cogid) == -1) {
              cognate_sets.push(cogid);
            }
          }
          
          if (cogid == proto_num) {
            var this_pform = proto_form;
          }
          else {
            var this_pform = '?';
          }
					var to_push = [idx, clean_taxa(taxon), gloss, num, original_gloss, word, ort, ipa, cogid, this_pform];
					for (var k=0,varium; varium=varia[k]; k++) {
						to_push.push(line[varium]);
					}
					table.push(to_push);

          //table.push([idx,clean_taxa(taxon),gloss,num,original_gloss,word,ort,ipa,cogid, this_pform]);
          keys.push(idx);
          idx += 1;
        }
      }
    }
  }
  /* clean table for negative cognate sets */
  cognate_counter += 1;
  for (var i=1,key; key=table[i]; i++) {
    if(table[i][8] < 0) {
      table[i][8] = -cognate_counter;
      cognate_counter += 1;
    }
  }
  
  var output = '';
  console.log(keys);
  old_concept = '';
  for (var i=0; i < table.length; i++) {//keys.length; i++) {
    var concept = table[i][2];
    if(old_concept != concept && i != 0) {
      output += '#\n';
      old_concept = concept;
    }
    output += table[i].join('\t')+'\n';
  }

  CFG['data'] = output;
  return table;
}

function clean_reflex (reflex) {
  reflex = reflex.split(/[,;\/]/)[0];
  reflex = reflex.replace(/-/g,'+');
  reflex = reflex.replace(/\s/g,'_');
  reflex = reflex.replace(/\[.*\]/g,'');
  reflex = reflex.replace(/\(.*\)/g,'');
  reflex = reflex.replace(/^\+/,'');
  reflex = reflex.replace(/\+$/,'');

  return reflex;
}

function process_reflexes(json) {
  
  /* get the sheet name */
  var json_keys = Object.keys(json);
  var sheet = json_keys[0];

  /* iterate over table first line and get taxon names and glosses */
  var taxa = [];
  var varia = [];
  var gloss_name = 'CONCEPT';
  var proto_name = 'PROTO';
  for (key in json[sheet][0]) {
    console.log("key",key);
    if (key.toUpperCase().indexOf('LNG') == key.length - 3) {
      taxa.push(key);
    }
    else if (['GLOSS','CONCEPT'].indexOf(key.replace(/\s/g,'').toUpperCase()) != -1) {
      gloss_name = key;
    }
    else if(['PROTO'].indexOf(key.replace(/\s/g,'').toUpperCase()) != -1) {
      proto_name = key;
    }
    else {
      if (key.slice(0,2) != '__') {
        varia.push(key);
      }
    }
  }
  console.log('varia',varia);
  console.log(json[sheet][0]);

  var table = [];
  var header = ['ID','DOCULECT','CONCEPT','COUNTERPART','IPA','PROTO', 'COGID'];
  for (var i=0,vario; vario=varia[i]; i++) {
    header.push(vario.toUpperCase());
  }
  table.push(header);

  /* iterate over list now and assign stuff */
  idx = 1;
  cogid = 1;
  for (var i=0,line; line=json[sheet][i]; i++) {
    /* get concept, proto, and varia */
    var concept = line[gloss_name];
    var proto = line[proto_name];
    var tmp_var = [];
    for (var j=0,vario; vario=varia[j]; j++) {
      tmp_vario = line[vario];
      if (typeof tmp_vario != 'undefined') {
        tmp_var.push(tmp_vario);
      }
      else {
        tmp_var.push('-');
      }
    }
    for (var j=0,taxon; taxon=taxa[j]; j++) {
      /* get the reflex */
      var reflex = line[taxon];
      var tax_name = taxon.replace(/\sLNG$/,'');

      /* check reflex */
      if (typeof reflex != 'undefined') {
        if (reflex.replace(/-/g,'').replace(/\s/g,'') != '') {
          var ipa = clean_reflex(reflex);
          var tmp_line = [idx,tax_name,concept,reflex,ipa,proto,cogid];
          for (var k=0; k < tmp_var.length; k++) {
            tmp_line.push(tmp_var[k]);
          }
          table.push(tmp_line);
          idx += 1;
        }
      }
    }
    cogid += 1;
  }
  var output = '';
  for (var i=0,line; line=table[i]; i++) {
    output += line.join('\t')+'\n';
  }
  CFG['data'] = output;

  return table;
}
/* process the excel file */
function process_wb(wb) {

	var output = "";
  var json = to_json(wb);
  
  /* check for select options */
  var options = document.getElementById('formats');
  var current_option = '';
  for (var i=0,option; option=options[i]; i++) {
    if(option.selected) {
      current_option = option.value;
      break;
    }
  }
  if (current_option == 'starling') {
    var table = process_starling(json);
  }
	else if (current_option == 'starlingx') {
		TOB = {};
		var table = process_starling(json);
	}
  else {
    var table = process_reflexes(json);
  }
  
  /* create starling table */
  $('#starling').html('<table cellpadding="0" cellspacing="0" border="0" class="display" id="starling_table"></table>' );
  
  /* create columns for data table */
  var cols = [];
  for(var i=0;i<table[0].length; i++) {
    cols.push( { "title" : table[0][i].toUpperCase()});
  }

  $('#starling_table').dataTable({
    "data": table.slice(1,table.length),
    "columns": cols
  });

  document.getElementById('message').innerHTML = '<br><br> Check below if your file has been successfully converted. Click ' +
    ' <span onclick="saveData();" style="cursor:pointer;background-color:red;border: 1px solid blue;">here</span> to download '+
    'the converted file &quot;'+CFG['filename'].replace('.xlsx','.qlc')+'&quot;<br><br>';
}




if(xlf.addEventListener) xlf.addEventListener('change', handleFile, false);

	var _gaq = _gaq || [];
	_gaq.push(['_setAccount', 'UA-36810333-1']);
	_gaq.push(['_trackPageview']);

	(function() {
		var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
		ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
		var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
	})();




