const fs = require('fs')
const fetch = require('node-fetch')

const INPUT_FILE = './data/lite_subscription_check_simon_report.csv'

// read an input file, find URLs, test the URLs and output findings
fs.readFile(INPUT_FILE, 'utf8', (err, data) => {
  if (err) throw err
  if (data) {

  	// harvest URLs from an input file
  	// ref: https://www.regextester.com/96146
  	let reg = /((http|ftp|https):\/\/)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
  	let urls = data.match(reg)

  	// some test variables to prevent long script running times when tweaking this file
  	//let u = data.match(reg)
  	//let urls = [u[0], u[1], u[3], u[4], u[5], u[6], u[7], u[8], u[9]]

  	console.log(`${urls.length} urls fetched from data source.`)
  	console.log('Making GET request from urls to determine if gzip encoding is enabled on server...')

  	// process all URLs discovered from input file
  	processRequests(urls)
  }
})

const processRequests = (urls) => {

	// set some basic headers, most importantly the encoding one
	let headers = {
	    'User-Agent':       'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36',
	    'Accept-Encoding': 	'gzip'
	}
	let gzipCounter = [],
		nonGzipCounter = [],
		nonOKstatii = [],
		urlsNotFound = 0

	// use map() to perform a fetch and handle the response for each url
	Promise.all(urls.map(url => fetch(url)
			.catch(logError)
		), {
		'headers': headers
	})
	.then(data => {

		// iterate all responses, tally gzipped, non-gzipped, inaccessible URLs and non-200 status URLs
		data.map(response => {
			if (typeof response === 'undefined') {
				urlsNotFound++
				return
			}
			if (response.status == 200) {
				if (response.headers.get('content-encoding') === 'gzip') {
					gzipCounter.push(response.url)
				} else {
					nonGzipCounter.push(response.url)
				}
			} else {
				nonOKstatii.push(response.url)
			}
		})

		// log out the findings once all async requests are processed
		console.log(`\n${urls.length} URLs processed...`)
		console.log(`> ${nonOKstatii.length} servers did not return a 200 status.`)
		console.log(`> ${gzipCounter.length} returned a 200 status and have gzip encoding enabled on the server.`)
		console.log(`> ${nonGzipCounter.length} servers returned a 200 status but do not have gzip enabled...\n`, nonGzipCounter)
		console.log(`> ${urlsNotFound} bad URLs were tried, but failed.`)

		// calculate % of gzip-enabled responses, adjusting the total # of URLs by the number of bad/inaccessible URLs
		let percentGzipped = Math.floor((urls.length - urlsNotFound - nonGzipCounter.length) / (urls.length - urlsNotFound) * 100)
		console.log(`> ${percentGzipped}% of valid URLs were served from gzip-enabled servers.`)
	})
}
const logError = (err) => {
	//console.log(err)
}
