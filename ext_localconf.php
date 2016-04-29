<?php

if (!defined('TYPO3_MODE')) {
	die('Access denied.');
}

// Add RTE transformation configuration (Page TS Config)
\TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPageTSConfig('<INCLUDE_TYPOSCRIPT: source="FILE:EXT:' . $_EXTKEY . '/Configuration/TsConfig/RteConfig.ts">');