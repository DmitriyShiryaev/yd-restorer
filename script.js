// Copyright 2020 Dmitrii Shiriaev. This software was released under the MIT license

function restore(date, dateBackupMaxString, excludeDir, excludedFiles, dateChangedMaxString) {

    //init('15 апреля', '2020-04-12T00:00:00+07:00');
    //init(c, '2020-04-12T00:00:00+07:00');
    //let date = '15 апреля';
    //let date = '15 апреля';
    //let date = '13 апреля';
    /*let dateBackupMaxString = '2020-04-12T00:00:00+07:00';
    let dateChangedMaxString = '2020-07-01T00:00:00+07:00';
    let excludeDir = 'Отчет';
    let excludedFiles = [

    ];*/

    let debug = false;
    let simulateRestore = false;

    excludedFiles = excludedFiles || [];
    let restoredFiles = [];
    let errorFiles = [];
    let dateBackupMax;
    let dateChangedMax;

    let $cluster;
    let $clusterTitle;
    let $restoreFrame;

    function init(date, dateBackupMaxString, dateChangedMaxString) {

        console.log("Init '" + date + "' day");

        dateBackupMax = new Date(dateBackupMaxString);
        if (isNaN(dateBackupMax)) {
            throw new Error("Invalid dateBackupMaxString '" + dateBackupMaxString + "'");
        }
        console.log("dateBackupMax: " + dateBackupMax.toISOString());

        if (dateChangedMaxString) {
            dateChangedMax = new Date(dateChangedMaxString);
            if (isNaN(dateChangedMax)) {
                throw new Error("Invalid dateChangedMaxString '" + dateChangedMaxString + "'");
            }
            console.log("dateChangedMax: " + dateChangedMax.toISOString());
        }

        $clusterTitle = $('.journal-cluster .journal-cluster__title:contains(' + date + ')');
        if ($clusterTitle.length < 1) {
            throw new Error("Can't find cluster title '" + date + "'");
        }

        $cluster = $clusterTitle.parents('.journal-cluster');
        if ($cluster.length < 1) {
            throw new Error("Can't find cluster with title '" + date + "'");
        }
        console.log("'" + date + "' cluster has been found");
        markProcessing($cluster);

        $('.root__content_page_journal').css('margin-right', '500px');
        $('.journal-filter').css('right', '500px');
        $restoreFrame = $("#restoreFrame");
        if($restoreFrame.length < 1) {
            $restoreFrame = $(
                '<iframe>',
                {
                    'id': "restoreFrame",
                    'src': '',
                    'style':
                        'position: fixed;' +
                        'top: 0;' +
                        'right: 0;' +
                        'height: 100%;' +
                        'width: 500px;' +
                        'z-index: 100;'
                }
            );
            $restoreFrame.appendTo('body');
        }
    }

    // restoreDay($cluster, excludeDir);
    async function restoreDay($cluster, excludeDir) {

        markExcluded($cluster.find('.journal-group:has(.journal-group__container:contains(' + excludeDir + '))'));

        await expandJournalGroups($cluster);

        await new Promise((resolve, reject) => {
            async function restoreJournalGroupChain($journalGroup) {
                while ($journalGroup.hasClass('processed')) {
                    $journalGroup = $journalGroup.next();
                }
                if ($journalGroup.length <= 0) {
                    resolve();
                    return;
                }

                markProcessing($journalGroup);

                console.log('journal-group__time:' + $journalGroup.find('.journal-group__time').text());

                let $journalGroupContainer = $journalGroup.find(
                    '.journal-group__container:contains(изменили файл),' +
                    '.journal-group__container:contains(изменили видео),' +
                    '.journal-group__container:contains(изменили фото)'
                );
                if ($journalGroupContainer.length > 0) {
                    console.log('journal-group is single');
                    await restoreSingle($journalGroupContainer);

                } else {
                    $journalGroupContainer = $journalGroup
                        .find('.journal-group__container:contains(изменили)')
                        .filter(function () {
                            return this.textContent.match(/изменили \d+/);
                        });
                    if ($journalGroupContainer.length > 0) {
                        console.log('journal-group is multiple');
                        await restoreMultiple($journalGroup);
                    }
                }

                markExcluded($journalGroup);
                setTimeout(function() { restoreJournalGroupChain($journalGroup.next()); }, 100);
            }

            restoreJournalGroupChain($clusterTitle.next());
        });

        console.log("'" + date + "' day has been processed");
        console.log(restoredFiles.length + ' restoredFiles: ', restoredFiles);
        console.log(errorFiles.length + ' errorFiles: ', errorFiles);

        markExcluded($cluster);
    }

    function markProcessing($element) {
        $element.css('border', '2px solid orange');
    }
    function markRestored($element) {
        markProcessed($element);
        $element.css('background', 'green');
        $element.css('border', '');
    }
    function markExcluded($element) {
        markProcessed($element);
        $element.css('background', 'gray');
        $element.css('border', '');
    }
    function markError($element) {
        markProcessed($element);
        $element.css('background', 'red');
        $element.css('border', '');
    }
    function markProcessed($element) {
        $element.addClass('processed');
    }

    /* $cluster.find(
        '.journal-group-content button:contains(Показать все),' +
        '.journal-group-content__button:contains(Показать все)',
    ).length */
    //(async () => { await expandJournalGroups($cluster); console.log('end'); })()
    async function expandJournalGroups($cluster) {

        const $document = $(document);
        await new Promise((resolve, reject) => {

            async function expandGroups() {
                const $buttons = $cluster.find(
                    '.journal-group-content button:contains(Показать),' +
                    '.journal-group-content__button:contains(Показать),',
                    '.journal-group-content__button:contains(Ещё)',
                );
                if ($buttons.length < 1) {
                    debug && console.log('No more expand buttons found');
                    resolve();
                    return;
                }

                debug && console.log('Clicking expand buttons');
                $buttons.click();

                debug && console.log('Waiting for journal-group-item');
                await elementAdded('.journal-group-item', $document, true);

                debug && console.log('journal-group-item appeared');

                setTimeout(expandGroups, 100);
            }
            expandGroups();
        });
    }

    async function restoreSingle($journalGroupContainer) {
        let $link = $journalGroupContainer
            .find('div > span > span > a');
        if ($link.length <= 0) {
            markExcluded($journalGroupContainer);
            return;
        }

        let href = $link.attr('href');
        const fileUrl = getFileUrl(href);
        if (!fileUrl) {
            markExcluded($journalGroupContainer);
            return;
        }

        const filePath = getFilePath(fileUrl);
        if (excludedFiles.indexOf(filePath) >= 0) {
            markExcluded($journalGroupContainer);
            return;
        }
        if (restoredFiles.indexOf(filePath) >= 0) {
            markRestored($journalGroupContainer);
            return;
        }
        if (errorFiles.indexOf(filePath) >= 0) {
            markError($journalGroupContainer);
            return;
        }

        let restored;
        try {
            restored = await restoreFile(href, dateBackupMax, dateChangedMax);
        } catch (e) {
            console.log(e);
            markError($journalGroupContainer);
            errorFiles.push(filePath);
            return;
        }

        if (restored) {
            markRestored($journalGroupContainer);
            restoredFiles.push(filePath);
        } else {
            markExcluded($journalGroupContainer);
            excludedFiles.push(filePath);
        }
    }

    async function restoreMultiple($journalGroup) {
        let $item = $journalGroup.find('.journal-group-item').first();

        await new Promise((resolve, reject) => {
            async function restoreItemChain($item) {
                while ($item.hasClass('processed')) {
                    $item = $item.next();
                }
                if ($item.length <= 0) {
                    resolve();
                    return;
                }

                markProcessing($item);
                let href;
                if ($item.is('a')) {
                    href = $item.attr('href');
                } else {
                    let $link = $item.find('a.journal-group-item__name');
                    if ($link.length <= 0) {
                        markExcluded($item);
                        setTimeout(function() { restoreItemChain($item.next()); }, 100);
                        return;
                    }
                    href = $link.attr('href');
                }

                const fileUrl = getFileUrl(href);
                if (!fileUrl) {
                    markExcluded($item);
                    setTimeout(function() { restoreItemChain($item.next()); }, 100);
                    return;
                }

                const filePath = getFilePath(fileUrl);
                if (excludedFiles.indexOf(filePath) >= 0) {
                    markExcluded($item);
                    setTimeout(function() { restoreItemChain($item.next()); }, 100);
                    return;
                }
                if (restoredFiles.indexOf(filePath) >= 0) {
                    markRestored($item);
                    setTimeout(function() { restoreItemChain($item.next()); }, 100);
                    return;
                }
                if (errorFiles.indexOf(filePath) >= 0) {
                    markError($item);
                    setTimeout(function() { restoreItemChain($item.next()); }, 100);
                    return;
                }

                let restored;
                try {
                    restored = await restoreFile(href, dateBackupMax, dateChangedMax);
                } catch (e) {
                    console.log(e);
                    markError($item);
                    errorFiles.push(filePath);
                    setTimeout(function() { restoreItemChain($item.next()); }, 100);
                    return;
                }

                if (restored) {
                    markRestored($item);
                    restoredFiles.push(filePath);
                } else {
                    markExcluded($item);
                    excludedFiles.push(filePath);
                }

                setTimeout(function() { restoreItemChain($item.next()); }, 100);
            }

            restoreItemChain($item);
        });
    }

    function getFileUrl(href) {
        if (!href) {
            return false;
        }
        const fileUrl = href.split('|')[1];
        if (!fileUrl) {
            return false;
        }
        return fileUrl;
    }

    function getFilePath(fileUrl) {
        return decodeURIComponent(
            fileUrl
                .replace('select/disk/', '')
                .replace('slider/disk/', '')
        );
    }

    //restoreFile('https://disk.yandex.ru/client/disk/%D0%94%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D1%8B/0Book/0%D0%92%D0%95%D0%94%D0%AB/0%D0%9A%D0%BD%D0%B8%D0%B3%D0%B8|select/disk/%D0%94%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D1%8B/0Book/0%D0%92%D0%95%D0%94%D0%AB/0%D0%9A%D0%BD%D0%B8%D0%B3%D0%B8/%D0%A1%D0%BB%D0%B0%D0%B2%D1%8F%D0%BD%D0%B5%20%D0%B8%20%D0%90%D1%80%D1%8C%D0%B8.%20%D0%9F%D1%83%D1%82%D1%8C%20%D0%B1%D0%BE%D0%B3%D0%BE%D0%B2%20%D0%B8%20%D1%81%D0%BB%D0%BE%D0%B2.pdf', new Date('2020-04-12T00:00:00+07:00'));
    //restoreFile('/client/disk/%D0%98%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F/0Photo/0%D0%9C%D0%BE%D0%B8/2018/2018.12.20%20%D0%9D%D0%BE%D0%B2%D0%BE%D0%B3%D0%BE%D0%B4%D0%BD%D0%B8%D0%B9%20%D1%83%D1%82%D1%80%D0%B5%D0%BD%D0%BD%D0%B8%D0%BA%20%D0%B2%20%D0%B4%D0%B5%D1%82%D1%81%D0%BA%D0%BE%D0%BC%20%D1%81%D0%B0%D0%B4%D1%83|slider/disk/%D0%98%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F/0Photo/0%D0%9C%D0%BE%D0%B8/2018/2018.12.20%20%D0%9D%D0%BE%D0%B2%D0%BE%D0%B3%D0%BE%D0%B4%D0%BD%D0%B8%D0%B9%20%D1%83%D1%82%D1%80%D0%B5%D0%BD%D0%BD%D0%B8%D0%BA%20%D0%B2%20%D0%B4%D0%B5%D1%82%D1%81%D0%BA%D0%BE%D0%BC%20%D1%81%D0%B0%D0%B4%D1%83/2018-12-20%2009-46-30.jpg', new Date('2020-04-12T00:00:00+07:00'));
    async function restoreFile(href, dateBackupMax, dateChangedMax) {
        let frameLoaded = $.Deferred();
        $restoreFrame.attr('src', href);
        $restoreFrame.on('load', frameLoaded.resolve);
        await frameLoaded.promise();
        $restoreFrame.off('load', frameLoaded.resolve);

        const $document = $($restoreFrame[0].contentWindow.document);

        let $groupableButtons = await elementAdded(
            '.groupable-buttons',
            $document[0].body
        );
        let $moreButton = $groupableButtons.find('.groupable-buttons__more-button');
        $moreButton.click();

        let $moreButtonPopup = await elementAdded('.groupable-buttons__more-button-popup', $document);
        let $actionVersions = $moreButtonPopup.find('.groupable-buttons__menu-button_action_versions');
        $actionVersions.click();

        await elementAdded('.versions-list__month-row', $document);

        /*console.log($document.find('.versions-dialog'));
        console.log($document.find('.versions-dialog').find('.versions-list__month-row'));*/

        let versionFound = false;

        await new Promise((resolve, reject) => {

            let breakSearch = false;
            $document
                .find('.versions-dialog')
                .find('.versions-list__month-row')
                .each(function (index) {
                    if (breakSearch) {
                        return false;
                    }
                    const $monthRow = $(this);
                    const year = $monthRow.text().match(/(\d+)/)[1];
                    debug && console.log('version year:' , year);
                    if (year > dateChangedMax.getFullYear()) {
                        breakSearch = true;
                        resolve();
                        return false;
                    }
                    if (year > dateBackupMax.getFullYear()) {
                        return true;
                    }
                    const $versionsListRow = $monthRow.next();

                    /*console.log($versionsListRow);
                    console.log($versionsListRow.find('.version-row__row'));*/

                    $versionsListRow.find('.version-row__row').each(function (index) {
                        const $versionRow = $(this);
                        // 15/04, 16:12:08
                        let dateArray =
                            $versionRow
                                .find('.version-row__version-date')
                                .text()
                                .match(/(\d+)\/(\d+),\s+(\d+):(\d+):(\d+)/);
                        const versionDate = new Date(
                            year,
                            dateArray[2] - 1,
                            dateArray[1],
                            dateArray[3],
                            dateArray[4],
                            dateArray[5]
                        );
                        debug && console.log('version date:' , versionDate.toISOString());
                        if (versionDate > dateChangedMax) {
                            debug && console.log('version date > dateChangedMax');
                            breakSearch = true;
                            resolve();
                            return false;
                        }
                        if (versionDate < dateBackupMax) {
                            debug && console.log('version date matched');
                            breakSearch = true;
                            versionFound = true;
                            setTimeout(async () => {
                                    await restoreVersion($versionRow, $document);
                                    console.log("'" + getFilePath(getFileUrl(href)) + "' has been restored to version '" + versionDate.toISOString() + "'");
                                    resolve();
                                }
                            );
                            return false;
                        }
                    });
                });
            if (!versionFound && !breakSearch) {
                reject("No suitable backup version found for '" + href + "'");
            }
        });

        return versionFound;
    }

    async function restoreVersion($versionRow, $document) {

        await elementAdded('.version-row__version-button_type_restore', $versionRow);
        const $buttonRestore = $versionRow.find('.version-row__version-button_type_restore');
        debug && console.log('$buttonRestore:', $buttonRestore);
        $buttonRestore.click();

        await elementAdded('.restore-confirm-dialog', $document);
        await elementClassAdded('.restore-confirm-dialog', 'modal_visible_yes', $document);

        if (simulateRestore) {
            await elementAdded('.restore-confirm-dialog .dialog__close', $document);
            const $confirmDialogClose = $document.find('.restore-confirm-dialog .dialog__close');
            debug && console.log('$confirmDialogClose:', $confirmDialogClose);
            $confirmDialogClose.click();

        } else {
            $document.find('.restore-confirm-dialog .restore-confirm-dialog__button-restore').click();
        }

        await elementClassRemoved('.restore-confirm-dialog', 'modal_visible_yes', $document);
    }

    function elementClassAdded(selector, cssClass, parent) {

        debug && console.log("waiting for '" + selector + "[+class=" + cssClass + "]'");

        return new Promise((resolve, reject) => {

            let $parent = $(parent);
            let $element = $parent.find(selector);
            debug && console.log($element);
            if ($element.hasClass(cssClass)) {
                resolve();
            }

            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {

                    debug && console.log(mutation);
                    debug && console.log($element.attr('class'));

                    if ($element.hasClass(cssClass)) {
                        observer.disconnect();
                        resolve();
                    }
                });
            });

            var config = {
                attributes: true,
                attributeFilter: ['class'],
            };

            observer.observe($element[0], config);
        });
    }

    function elementClassRemoved(selector, cssClass, parent) {

        debug && console.log("waiting for '" + selector + "[-class=" + cssClass + "]'");

        return new Promise((resolve, reject) => {

            let $parent = $(parent);
            let $element = $parent.find(selector);
            if (!$element.hasClass(cssClass)) {
                resolve();
            }

            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {

                    debug && console.log(mutation);
                    debug && console.log($element.attr('class'));

                    if (!$element.hasClass(cssClass)) {
                        observer.disconnect();
                        resolve();
                    }
                });
            });

            var config = {
                attributes: true,
                attributeFilter: ['class'],
            };

            observer.observe($element[0], config);
        });
    }

    async function elementAdded(selector, parent, forceWait) {

        debug && console.log("Waiting for '" + selector + "'");

        return new Promise((resolve, reject) => {

            let $parent = $(parent);
            if (!forceWait) {
                let $element = $parent.find(selector);
                debug && console.log('elementAdded: element:', $element);
                if ($element.length > 0) {
                    debug && console.log("'" + selector + "'" + " appeared");
                    resolve($element);
                }
            }

            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                        [].some.call(mutation.addedNodes, function (el) {
                            debug && console.log('elementAdded: element:', el);
                            let $element = $(el);
                            if ($element.is(selector)) {
                                observer.disconnect();
                                debug && console.log("'" + selector + "'" + " appeared");
                                resolve($element);
                            }
                        });
                    }
                });
            });

            var config = {
                childList: true,
                subtree: true,
            };

            observer.observe($parent[0], config);
        });
    }

    init(date, dateBackupMaxString, dateChangedMaxString);
    restoreDay($cluster, excludeDir);
}


/*restore('12 апреля', '2020-04-12T00:00:00+07:00', 'Отчет', [

]);
*/
// restore('13 апреля', '2020-04-12T00:00:00+07:00', 'Отчет');
