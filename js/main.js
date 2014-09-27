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

/* process the excel file */
function process_wb(wb) {

	var output = "";
  var json = to_json(wb);
  
  /* get taxa */
  var taxa = [];
  for(key in json['Sheet1'][0]) {
    if (key.slice(0,2) != '__' && key.indexOf('#') != key.length -1 && key.indexOf('Number') == -1 && key.indexOf('Word') == -1) {
      taxa.push(key);
    }
  }
  var table =[["ID",'TAXA','GLOSS','GLOSSID','STARLING','ORTHOGRAPHY',"IPA","COGID"]];
  var cognate_counter = 0;
  var current_gloss = '';
  var idx = 1;
  var cognate_sets = [];
  var keys = [0];
  for (var i=1,line; line=json['Sheet1'][i]; i++) {
    var gloss = line['Word'];
    var num = line['Number'];
    for (var j=0,taxon; taxon = taxa[j]; j++) {
      var word = line[taxon];
      var cogid = parseInt(line[taxon+' #']);
      if (cogid != 0 && typeof word != 'undefined') {
        if (word.replace(/\s/g,'') != '') {
          if (gloss != current_gloss) {
            cognate_counter += cognate_sets.length;
            cognate_sets = [];
            current_gloss = gloss;
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
            cogid = cognate_counter + cogid;
            if (cognate_sets.indexOf(cogid) == -1) {
              cognate_sets.push(cogid);
            }
          }
          table.push([idx,clean_taxa(taxon),gloss,num,word,ort,ipa,cogid]);
          keys.push(idx);
          idx += 1;
        }
      }
    }
  }
  /* clean table for negative cognate sets */
  cognate_counter += 1;
  for (var i=1,key; key=table[i]; i++) {
    if(table[i][7] < 0) {
      table[i][7] = -cognate_counter;
      cognate_counter += 1;
    }
  }
  
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




