import * as child_process from 'child_process'
import * as path from 'path'

type slic3rArgs = {
    path: string,
    '-o'?: string
    '--fill-pattern'?: string,
    '--fill-density'?: string,
    '--skirts'?: number,
    '--filament-diameter'?: number,
    '--nozzle-diameter'?: number,
    '--layer-height'?: number,
    '--extrusion-width'?: number
}

const FILAMENT_REQUIRED_REGEX = /\(([\d\.]+)cm3\)/i;

class Slic3r {
    private eventHandlers: {[key: string]: Array<Function>} = {}

    public report: {
        volume: number
    }

    constructor(private slic3rArgs: slic3rArgs){
        console.log('Slicing:',slic3rArgs.path)
        this.execSlic3r()
    }

    public on(event: string, handler: Function){
        if (!Array.isArray(this.eventHandlers[event])){
            this.eventHandlers[event] = []
        }
        this.eventHandlers[event].push(handler)
    }

    trigger(event: string, data: any){
        if (!Array.isArray(this.eventHandlers[event])){
            return
        }
        this.eventHandlers[event].forEach(handler => {
            handler(data)
        })
    }
    
    execSlic3r(){
        const { path: modelPath, ...additionalArgs } = this.slic3rArgs
        const slic3rArgsArr = [modelPath]
        Object.keys(additionalArgs).forEach(key => {
            slic3rArgsArr.push(key, additionalArgs[key])
        })
        const slic3rProcess = child_process.execFile(
            path.join(process.cwd(), 'Slic3r/Slic3r'),
            slic3rArgsArr,
            {
                cwd: path.join(process.cwd(), 'Slic3r/')
            },
            (err, stdout, stderr) => {
                if (err){
                    this.trigger('error', err)
                } else {
                    const match = FILAMENT_REQUIRED_REGEX.exec(stdout.trim())
                    if (match){
                        this.report = {
                            volume: Number(match[1])
                        }
                        this.trigger('done', {
                            message: stdout.trim(),
                            process: 1,
                            volume: Number(match[1])
                        })
                        
                    }
                    else{
                        console.log(match)
                        this.trigger('error', 'Fail to parse Filement required')
                        console.error('Fail to parse Filement required', stdout.trim())
                    }
                }
            }
        )
        
        slic3rProcess.stdout.on('data', data => {
            if (data.indexOf('Processing triangulated mesh') !== -1){
                this.trigger('progress', {
                    message: data.trim(),
                    process:0.1
                });
            }
            else if (data.indexOf('Generating perimeters') !== -1){
                this.trigger('progress', {
                    message: data.trim(),
                    process:0.25
                });
            }
            else if (data.indexOf('Preparing infill') !== -1){
                this.trigger('progress', {
                    message: data.trim(),
                    process:0.4
                });
            }
            else if (data.indexOf('Infilling layers') !== -1){
                this.trigger('progress', {
                    message: data.trim(),
                    process:0.55
                });
            }
            else if (data.indexOf('Generating skirt') !== -1){
                this.trigger('progress', {
                    message: data.trim(),
                    process:0.7
                });
            }
            else if (data.indexOf('Exporting G-code') !== -1){
                this.trigger('progress', {
                    message: data.trim(),
                    process:0.85
                });
            }
            else if (data.indexOf('Done. Process took') !== -1){
                this.trigger('progress', {
                    message: data.trim(),
                    process:0.95
                });
            }
        })
    }
}

export default Slic3r