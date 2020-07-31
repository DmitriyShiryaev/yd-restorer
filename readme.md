# Yandex.Disk restorer

This software can restore a lot of files saved on Yandex.disk at once. 

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Limitations](#limitations)
- [How to use](#how-to-use)
- [Interface](#interface)
  - [Script call](#script-call)
    - [Signature](#signature)
    - [Parameters](#parameters)
  - [GUI](#gui)
  - [Debugging](#debugging)
- [How to update the table of contents of this readme file automatically](#how-to-update-the-table-of-contents-of-this-readme-file-automatically)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


<a name="limitations"></a>
## Limitations

- only the Yandex.Disk interface in Russian is supported
- only changes in one day can be reverted at a time
- not all files can be recovered in one run of this script, but this script is incremental and can be run many times
- before every run of this script you must reload Yandex.Disk history page   


<a name="how-to-use"></a>
## How to use

1. (optional) Disable loading of images preview for Yandex.Disk in your content blocking software

    This will significantly reduce incoming traffic and increase performance in case you have many images in changed folders. 

    Example of "My filters" for uBlock origin for Russian Yandex.Disk domain:
    ```
    ||downloader.disk.yandex.ru/preview/$image
    ```
2. Open Yandex.disk history
    
    Use [https://disk.yandex.ru/client/journal](https://disk.yandex.ru/client/journal) for Russian Yandex.Disk domain 

3. Set the day you want to restore in filter at top right

4. Open developer console of your browser

    Press `CTRL+SHIFT+k` for Firefox

5. Paste source code of [./script.js](./script.js) file, press `ENTER`

6. Paste the call template

    - Case A. Paste the following template in case you have NO list of file pathes to restore:  

        ```javascript
        restore(
            'Day caption of YD history',
            'dateBackupMaxString',
            'dateChangedMaxString',
            [
                'path/to/excluded/folder1',
                'path/to/excluded/folder2'    
            ],
            [
                'path/to/excluded/file1',
                'path/to/excluded/file2'
            ]
        )
        ```
    
    - Case B. Paste the following template in case you have list of file pathes to restore:  

        ```javascript
        restore(
            'Day caption of YD history',
            'dateBackupMaxString',
            'dateChangedMaxString',
            [],
            [],
            [
                'path/to/fileToRestore1',
                'path/to/fileToRestore2'
            ]
        )
        ```

7. Edit the template to fit your needs

    See `Interface` for details
    
    You will get some like the following  in case you have NO list of file pathes to restore:
    ```javascript
    restore(
        '15 апреля',
        '2020-04-12T00:00:00+07:00',
        '2020-07-01T00:00:00+07:00'
    )
    ```

8. Run the script by pressing `ENTER`

9. Wait until the script ends

    You will see a message like `xxx day has been processed`, some statistics and list of restored files in your browser console
    
10. Check your restored files

11. (optional) Reload Yandex.Disk history page and run the script some more times if necessary

    This script is incremental and can be run many times. Before every run of this script you must reload Yandex.Disk history page

12. (optional) If some of your files are not restored you can enable debug mode to see what happened

    See `Debugging` for details

13. (optional) Enable loading of images preview for Yandex.Disk in your content blocking software

    Delete the rule you was created on step 1.
    
    For example for uBlock origin and for Russian Yandex.Disk domain delete from "My filters" the following string:
    ```
    ||downloader.disk.yandex.ru/preview/$image
    ```


<a name="interface"></a>
## Interface

<a name="script-call"></a>
### Script call

<a name="signature"></a>
#### Signature

```javascript
restore(date, dateBackupMaxString, dateChangedMaxString, excludedFolders, excludedFiles, filesToRestore)
```

<a name="parameters"></a>
#### Parameters

| name                  | required  | example value                 | description   |
| ---                   | ---       | ---                           | ---           |
| date                  | Yes       | '15 апреля'                   | Caption of day in YD history to restore |
| dateBackupMaxString   | Yes       | '2020-04-12T00:00:00+07:00'   | Find backup for a file to restore not older than this date. See [Javascript Date.parse interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse) for format details |
| dateChangedMaxString  | Yes       | '2020-07-01T00:00:00+07:00'   | Skip files changed after this date. See [Javascript Date.parse interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse) for format details |
| excludedFolders       | No        | \['path/to/excluded/folder1', 'path/to/excluded/folder2'] | The list of folders to exclude |
| excludedFiles         | No        | \['path/to/excluded/file1', 'path/to/excluded/file2'] | The list of files to exclude |
| filesToRestore        | No        | \['path/to/fileToRestore1', 'path/to/fileToRestore2'] | List of files to restore |


<a name="gui"></a>
### GUI

Script will show work progress by highlighting performed files in YD history. 

| Color     | Description |
| ---       | --- |
| Orange    | The file/file group/day is being processed |
| Green     | The file was restored |
| Red       | An error occured during the file restore |
| Gray      | The file was skipped |


<a name="debugging"></a>
### Debugging 

1. Save the source code of the script to your computer

2. Adjust the following debugging variables in the top of `restore` function:

    | name              | Default value | description   |
    | ---               | ---           | ---           |
    | debug             | false         | Set to true to enable debug mode with verbose output |
    | simulateRestore   | false         | Set to true to simulate restore (dry run) |
    | showFrame         | false         | Set to true to show frame with YD GUI the script works with under the hood |
    | expandHistory     | true          | Set to false to not expand the YD history before collecting files to restore by the history. It can speed up the development |

3. Follow the `How to use` procedure, use the script with your adjustments
 

<a name="how-to-update-the-table-of-contents-of-this-readme-file-automatically"></a>
## How to update the table of contents of this readme file automatically

The table of contents includes hyperlinks to readme sections.

After adding, removing or changing any headers in the readme, update the table of contents (TOC):

1. Rebuild TOC itself

    Unix:
    ```bash
    docker run --rm -it -v $(pwd)/readme.md:/usr/src/readme.md jorgeandrada/doctoc --maxlevel 4
    ```

    This command runs [doctoc](https://github.com/thlorenz/doctoc) to generate links to headers of 1-4 levels.

2. Add link anchors to new headers, update them in changed headers.
    Link name is the header in lowercase and with dashes instead of spaces.
    It looks like this in the TOC:

    ```markdown
    - [Section Header](#section-header)
    ```

    Add the link anchor before the header, like this:

    ```markdown
    <a name="section-header"></a>
    # Section Header
    ``` 
