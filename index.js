const fs = require('fs-extra')
const cheerio = require('cheerio')
const fetch = require('node-fetch')
const request = require('request-promise-native')
require('colors')

/**
 * 
 * @description global variables
 */
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

/**
 * 
 * @param {string} url
 * @param {string} filename
 * @description downloads a file from a url and saves it to the current directory
 */
const downloadPDF = (url, filename) => new Promise(async (resolve, reject) => {
  try {
    const pdfBuffer = await request.get({ uri: url, encoding: null })
    await fs.writeFileSync(`./downloads/${filename}.pdf`, pdfBuffer)
    resolve(true)
  } catch (err) {
    resolve(false)
  }
})

/**
 * 
 * @param {string} url 
 * @description scrapes subject content from a url
 */
const scrapeSubjects = (url) => new Promise(async (resolve, reject) => {
  try {
    const html = await (await fetch(url, { method: 'GET' })).text()
    const $ = cheerio.load(html)
    const htmlArray = await $('.ep_view_page > p > a').map(function () {
      return {
        contentUrl: $(this).attr('href'),
        contentTitle: ($(this).text()).toUpperCase().replace(/(?:\r\n|\r|\n)/g, ' ').replace(/\s\s+/g, ' ').replace('\/', ' ')
      }
    }).toArray()
    for (let [index, value] of htmlArray.entries()) {
      const { contentUrl, contentTitle } = htmlArray[index]
      try {
        console.log(`${index} - Extracting data : "${contentUrl}" - ${contentTitle.substr(0, 100)}...`.cyan)
        if (!(await fs.existsSync(`./downloads/${contentTitle}.pdf`))) {
          const contentDetail = await (await fetch(contentUrl, { method: 'GET' })).text()
          const contentPreviewText = cheerio.load(contentDetail)('a.ep_document_link').text()
          const contentPreviewURL = cheerio.load(contentDetail)('a.ep_document_link').attr('href')
          const contentPreviewSize = parseInt(contentPreviewText.split('(')[1].split('MB)')[0])
          if (contentPreviewSize <= 10) {
            console.log(`  -> Downloading "${contentUrl.yellow}" (${contentPreviewSize}MB)`)
            const contentDownload = await downloadPDF(contentPreviewURL, contentTitle)
            if (contentDownload) {
              console.log(`  -> Success, file already saved in "downloads" folder...`.green)
              console.log(`  -> Rename file name to extracting result...`.green)
              console.log('-'.yellow)
            } else {
              console.log(`  -> Error, file maybe not found...`.red)
            }
          } else {
            console.log(`  -> Skip, file size more than 10MB...`.red)
          }
        } else {
          console.log(`  -> Skip, file already exists...`.red)
        }
        console.log('-'.yellow)
      } catch (err) { }
    }
    resolve(true)
  } catch (err) {
    resolve(false)
  }
})
  
/**
 * @description  main function
 */
;(async () => {
  try {
    const uriSubjects = ['https://eprints.uny.ac.id/view/subjects/G5.html', 'https://eprints.uny.ac.id/view/subjects/teknik-informatika.html']
    for (let [indexSubject, dataSubject] of uriSubjects.entries()) {
      await scrapeSubjects(uriSubjects[indexSubject])
    }
  } catch (err) {
    console.error(`ERROR: ${err.message}`)
  }
})()