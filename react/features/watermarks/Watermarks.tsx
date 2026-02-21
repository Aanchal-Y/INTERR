import React, { Component } from 'react';

export default class Watermarks extends Component {
	// stop rendering any brand watermark
	_renderBrandWatermark() {
		return null;
	}

	// stop rendering any jitsi watermark
	_renderJitsiWatermark() {
		return null;
	}

	// stop rendering "powered by" or similar credit
	_renderPoweredBy() {
		return null;
	}
}