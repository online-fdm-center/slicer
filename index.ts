import * as request from 'request-promise-native'
import * as path from 'path'
require('dotenv').config()
import Slic3r, { IProgress } from './slic3r'

const check = () => {
    request({
        url: `${process.env.API_URL}/getFileToProcess`,
        method: 'POST',
        headers: {
            'x-server-token': process.env.ADMIN_AUTH_TOKEN
        }
    })
    .then(answer => {
        return JSON.parse(answer)
    }).then(answer => {
        if (answer === null){
            setTimeout(check, 3000)
        } else {
            try {
                const slic3r = new Slic3r({
                    path: path.join(process.env.STL_DIR, answer.filename),
                    '-o': '/tmp/',
                    '--fill-pattern': 'rectilinear',
                    '--fill-density': '100%',
                    '--skirts': 0,
                    '--filament-diameter': 1.75,
                    '--nozzle-diameter': 0.45,
                    '--layer-height': 0.25,
                    '--extrusion-width': 0.45

                })
                slic3r.on('progress', (data: IProgress) => {
                    request({
                        url: `${process.env.API_URL}/files/${answer.id}/sliceProgress`,
                        method: 'POST',
                        headers: {
                            'x-server-token': process.env.ADMIN_AUTH_TOKEN,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            progress: data.progress,
                            text: data.message
                        })
                    })
                })
                slic3r.on('done', data => {      
                    const bodyToSend = {
                        amount: slic3r.report.volume
                    }
                    console.log('send', JSON.stringify(bodyToSend))
                    request({
                        url: `${process.env.API_URL}/files/${answer.id}/setAmount`,
                        method: 'POST',
                        headers: {
                            'x-server-token': process.env.ADMIN_AUTH_TOKEN,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(bodyToSend)
                    })
                    check()
                })
                slic3r.on('error', error => {
                    console.error(error)
                    request({
                        url: `${process.env.API_URL}/files/${answer.id}/sliceProgress`,
                        method: 'POST',
                        headers: {
                            'x-server-token': process.env.ADMIN_AUTH_TOKEN,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            progress: 1,
                            error: 'Slicing error'
                        })
                    })
                    setTimeout(check, 3000)
                })
            } catch (e) {
                console.error(e)
                setTimeout(check, 3000)
            }
            
        }
    })
    .catch(error => {
        console.error(error)
        setTimeout(check, 3000)
    })
}

check()
