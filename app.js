const util = require('util');
const fs = require('fs');
const fileSystemPath = require('path');
const request = require('request');
const events = require('events');

var readFile = util.promisify(fs.readFile);
// var promisifyRequest = util.promisify(request);

const FILE_PATH = fileSystemPath.resolve() + "/public/files/big.txt";
const WORD_LIST_FILE = fileSystemPath.resolve() + "/public/files/wordList" + (new Date(2010, 6, 26).getTime() / 1000) + ".txt";
const YANDEX_LOOKUP_API = "https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=dict.1.1.20170610T055246Z.0f11bdc42e7b693a.eefbde961e10106a4efa7d852287caa49ecc68cf&lang=en-en&text=";

var finalWordsArray;
var finalResponse = [];

readFile(FILE_PATH, 'utf8').then((data) => {
	// if (err) { throw err };
	console.log("Analyzing File...");

	var wordsArray = data.split(/\s+/);
	var wordsMap = createWordMap(wordsArray);
	finalWordsArray = sortByCount(wordsMap);
	var array = finalWordsArray.slice(0, 10);
	return array;
}).then(async (array) => {
	for (let key in array) {

		let tempData = await getData(array[key].name, array[key].total);
		finalResponse.push(tempData);
	}//for
	return finalResponse;
}).then((finalData) => {
	console.log(finalData);
}).catch((err) => {
	console.log('Error', err);
});

async function getData(text, count) {
	return new Promise((resolve, reject) => {
		request(YANDEX_LOOKUP_API + text, (err, res, body) => {
			if (err) { return console.log(err); }

			if (res.statusCode == 200) {
				let tempJson = JSON.parse(body);

				let synonymsArray = [];
				let _word = text;
				let _pos = tempJson['def'].pos || "-";
				let wordCount = count;

				if (tempJson['def'].length > 0) {
					if (tempJson['def'][0].hasOwnProperty('tr')) {
						let tempSyn = tempJson['def'][0]['tr'];
						for (var i = 0; i < tempSyn.length; i++) {
							var obj = tempSyn[i];
							if (obj.hasOwnProperty('syn')) {
								for (var j = 0; j < obj['syn'].length; j++) {
									var innerSyn = obj['syn'][j];
									synonymsArray.push(Object.values(innerSyn)[0]);
								}
							}
						}
					}
				}

				var temp = {
					word: _word,
					output: {
						occurence: wordCount,
						pos: _pos,
						synonyms: synonymsArray.join(",")
					}
				}
				resolve(temp);
			}
		});
	})
}

function createWordMap(wordsArray) {
	var wordsMap = {};

	wordsArray.forEach(function (key) {
		if (wordsMap.hasOwnProperty(key)) {
			wordsMap[key]++;
		} else {
			wordsMap[key] = 1;
		}
	});

	return wordsMap;

}

function sortByCount(wordsMap) {
	var finalWordsArray = [];
	finalWordsArray = Object.keys(wordsMap).map(function (key) {
		return {
			name: key,
			total: wordsMap[key]
		};
	});

	finalWordsArray.sort(function (a, b) {
		return b.total - a.total;
	});

	return finalWordsArray;
}