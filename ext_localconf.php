<?php

if (!defined('TYPO3_MODE')) {
	die('Access denied.');
}

// Add RTE transformation configuration (Page TS Config)
// NOTE: take care of other page ts config files that might reset the RTE.default setup and override the rte_plus config!
\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPageTSConfig(
		'<INCLUDE_TYPOSCRIPT: source="FILE:EXT:' . $_EXTKEY . '/Configuration/TsConfig/RteConfig.ts">'
);


// Adding the extension to rtehtmlarea
$rteExtKey = 'rtehtmlarea';
$TYPO3_CONF_VARS['EXTCONF'][$rteExtKey]['plugins']['MarkChange'] = array();
$TYPO3_CONF_VARS['EXTCONF'][$rteExtKey]['plugins']['MarkChange']['objectReference'] = '&CAG\\RtePlus\\Extension\\MarkChange';
$TYPO3_CONF_VARS['EXTCONF'][$rteExtKey]['plugins']['MarkChange']['addIconsToSkin'] = 0;
$TYPO3_CONF_VARS['EXTCONF'][$rteExtKey]['plugins']['MarkChange']['disableInFE'] = 1;

// Register command controller.
$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['extbase']['commandControllers'][] = 'CAG\RtePlus\Command\RtePlusCommandController';