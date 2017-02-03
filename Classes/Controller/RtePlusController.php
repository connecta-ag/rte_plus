<?php
namespace CAG\RtePlus\Controller;


/***************************************************************
 *
 *  Copyright notice
 *
 *  (c) 2017 Kai Groetenhardt <k.groetenhardt@connecta.ag>, Connecta AG
 *
 *  All rights reserved
 *
 *  This script is part of the TYPO3 project. The TYPO3 project is
 *  free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  The GNU General Public License can be found at
 *  http://www.gnu.org/copyleft/gpl.html.
 *
 *  This script is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  This copyright notice MUST APPEAR in all copies of the script!
 ***************************************************************/

/**
 * Class RtePlusController
 *
 * @package CAG\RtePlus\Controller
 * @author Kai Groetenhardt <k.groetenhardt@connecta.ag>
 */
class RtePlusController extends \TYPO3\CMS\Extbase\Mvc\Controller\ActionController {

    protected static $TAG_INS = "ins";
    protected static $TAG_DEL = "del";

    public function listChangedPagesAction() {

        $pages = array();

        /* Extract all change dates and pages of the contents. */
        foreach ($this->settings['markupFields'] as $tablename => $fieldsCommaSeparated) {
            $fields = explode(",", str_replace(" ", "", $fieldsCommaSeparated));
            if ($tablename == "tt_content") {
                $recordsWithMarkups = $this->findRecordWithMarkups($tablename, $fields);
                foreach($recordsWithMarkups as $uid => &$recordWithMarkups) {
                    $changeDates = $this->getChangeDates($recordWithMarkups['bodytext']);
                    if (count($changeDates) > 0) {
                        arsort($changeDates);
                        $recordWithMarkups['uid'] = $uid;
                        $recordWithMarkups['latestChnage'] = array_values($changeDates)[0];
                        $pages[$recordWithMarkups['pid']]['changedDates'][] = array_values($changeDates)[0];
                        $pages[$recordWithMarkups['pid']]['uid'] = $recordWithMarkups['pid'];
                    }
                }
            }
        }

        $changesSortHelper = array(); // Used to sort pages by date.

        /* Get latest change date of the pages. */
        $pageUids = array();
        foreach($pages as $uid => &$item) {
            arsort($item['changedDates']);
            $item['newestDate'] = array_values($item['changedDates'])[0];
            $changesSortHelper[] = array_values($item['changedDates'])[0];
            $pageUids[$uid] = $uid;
        }
        array_multisort($changesSortHelper, SORT_DESC, SORT_NUMERIC, $pages); // Sort by date.

        /* Add some more information (e.g. title) */
        $pageInfos = $this->getPages($pageUids);
        $parentPageUids = array();
        foreach($pages as $uid => &$item) {
            $item['title'] = $pageInfos[$item['uid']]['title'];
            $item['pid'] = $pageInfos[$item['uid']]['pid'];
            $parentPageUids[] = $item['pid'];
        }

        /* Add information of parent pages. */
        $parentPageInfos = $this->getPages($parentPageUids);
        foreach($pages as $uid => &$item) {
            $item['parent']['uid'] = $parentPageInfos[$item['pid']]['uid'];
            $item['parent']['title'] = $parentPageInfos[$item['pid']]['title'];
        }

        $this->view->assign("pages", $pages);
    }

    /**
     * Get pages with given uids.
     *
     * @param $pageUids
     * @return array
     */
    protected function getPages($pageUids) {
        if (!is_array($pageUids) || count($pageUids) == 0) {
            return array();
        }
        $queryFields = "uid, pid, title";
        $tables = "pages";
        $where = array();
        $where[] = "deleted = 0";
        $where[] = "hidden = 0";
        $where[] = "uid IN (" . implode(",", $pageUids) . ")";
        $results = $GLOBALS['TYPO3_DB']->exec_SELECTgetRows($queryFields, $tables, implode(" AND ", $where));
        $resultToReturn = array();
        foreach($results as $result) {
            $resultToReturn[$result['uid']] = $result;
        }
        return $resultToReturn;
    }

    /**
     * Returns all dates in ins und del tags in order of appearance.
     *
     * @param $text
     * @return array
     */
    protected function getChangeDates($text) {
        $tagNames = array(self::$TAG_INS, self::$TAG_DEL);
        $changeDates = array();
        foreach($tagNames as $tagName) {
            $startTagStartPos = 0;
            do {
                $startTagStartPos = strpos($text, "<" . $tagName, $startTagStartPos);
                if ($startTagStartPos !== false) {
                    $startTagEndPos = strpos($text, ">", $startTagStartPos) + 1;
                    if ($startTagEndPos !== false) {
                        /* We found a tag. */
                        $startTag = substr($text, $startTagStartPos, $startTagEndPos - $startTagStartPos);

                        /* Extract the attributes. */
                        $matches = array();
                        $preg = "/(\\S+)=[\"']?((?:.(?![\"']?\\s+(?:\\S+)=|[>\"']))+.)[\"']?/";
                        preg_match_all($preg, $startTag, $matches);

                        /* Get the date attribute */
                        $dataTimestampIndex = -1;
                        for ($i = 0; $i < count($matches[1]); $i++) {
                            if ($matches[1][$i] == "data-timestamp") {
                                $dataTimestampIndex = $i;
                                break;
                            }
                        }

                        /* Convert text date to timestamp. */
                        try {
                            $date = \DateTime::createFromFormat("d.m.Y H:i", $matches[2][$dataTimestampIndex]);
                            $date->setTime(0, 0, 0);
                            $tstamp = $date->getTimestamp();
                        } catch(\Exception $ex) {
                            $startTagStartPos++;
                            continue;
                        }

                        $changeDates[] = $tstamp;

                        $startTagStartPos = $startTagEndPos;
                    }
                }
            } while ($startTagStartPos !== false);
        }
        return $changeDates;
    }

    /**
     * Gets DB records in given table that contain at least one "<ins" or "<del".
     *
     * @param $tablename Tablename
     * @param $fields Array of fields.
     * @return array
     */
    protected function findRecordWithMarkups($tablename, $fields) {
        if (count($fields) == 0) {
            return null;
        }
        $queryFields = "uid, pid, ".implode(",", $fields);
        $where = array();
        $where[] = "deleted = 0";
        $where[] = "hidden = 0";
        $where[] = "pid > 0";
        $tempOr = array();
        foreach ($fields as $field) {
            $tempOr[] = $field." LIKE '%<ins%'";
            $tempOr[] = $field." LIKE '%<del%'";
        }
        $where[] = "(".implode(" OR ", $tempOr).")";
        $results = $GLOBALS['TYPO3_DB']->exec_SELECTgetRows($queryFields, $tablename, implode(" AND ", $where));
        $resultsForReturn = array();
        foreach($results as &$result) {
            $uid = $result['uid'];
            unset($result['uid']);
            $resultsForReturn[$uid] = $result;
        }
        return $resultsForReturn;
    }
}