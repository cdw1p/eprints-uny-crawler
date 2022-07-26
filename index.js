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
 * @description downloads a file from a url and saves it to the current directory
 */
const downloadPDF = (url) => new Promise(async (resolve, reject) => {
  try {
    const pdfBuffer = await request.get({ uri: url, encoding: null })
    await fs.writeFileSync(`./downloads/${url.split('/').pop()}`, pdfBuffer)
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
    await $('.ep_view_page > p > a').each(async function (index, content) {
      try {
        const contentTitle = ($(this).text()).toUpperCase().replace(/(?:\r\n|\r|\n)/g, ' ').replace(/\s\s+/g, ' ').replace('\/', ' ')
        const contentUrl = $(this).attr('href')
        console.log(`  -> Extracting data : "${contentUrl}" - ${contentTitle.substr(0, 100)}...`.cyan)
        const contentDetail = await (await fetch(contentUrl, { method: 'GET' })).text()
        const contentPreview = cheerio.load(contentDetail)('a.ep_document_link').attr('href')
        const contentDownload = await downloadPDF(contentPreview)
        console.log(`  -> Downloading "${contentUrl.yellow}"...`)
        if (contentDownload) {
          console.log(`  -> Success, file already saved in "downloads" folder...`.green)
          console.log(`  -> Rename file name to extracting result...`.green)
          await fs.renameSync(`./downloads/${contentPreview.split('/').pop()}`, `./downloads/${contentTitle}.pdf`)
        } else {
          console.log(`  -> Error, file maybe not found...`.red)
        }
        console.log('-'.yellow)
      } catch (err) { }
    })
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