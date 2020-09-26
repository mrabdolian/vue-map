export default {
	data() {
		return {
			styles: { // fake values should be updated
				point: {
					gasStation: {
						normal: {
							circle: {
								color: '#99D97E',
								zIndex: 9,
							},
						},
					},
					// trafficPlan: {
					// 	normal: {
					// 		circle: {
					// 			color: '#FF7E7E',
					//			zIndex: 9,
					// 		},
					// 	},
					// },
					publicTransportation: {
						normal: {
							circle: {
								color: '#ACCDFF',
								zIndex: 9,
							},
						},
					},
					food: {
						normal: {
							circle: {
								color: '#FFF3A7',
								zIndex: 9,
							},
						},
					},
					institute: {
						normal: {
							circle: {
								color: '#FFBF7E',
								zIndex: 9,
							},
						},
					},
					// default: {
					// 	normal: {
					// 		circle: {
					// 		},
					// 	},
					// },
					rent: {
						normal: {
							circle: {
								color: '#86BCFF',
							},
						},
						hover: {
							circle: {
								color: '#86BCFF',
							},
						},
						selected: {
							circle: {
								color: '#54A0FF',
							},
						},
						disabled: {
							circle: {
								color: '#707070',
							},
						},
						disabledSelected: {
							circle: {
								color: '#505050',
							},
						},
					},
					sell: {
						normal: {
							circle: {
								color: '#F38586',
							},
						},
						hover: {
							circle: {
								color: '#F38586',
							},
						},
						selected: {
							circle: {
								color: '#EE5152',
							},
						},
						disabled: {
							circle: {
								color: '#707070',
							},
						},
						disabledSelected: {
							circle: {
								color: '#505050',
							},
						},
					},
					rentSquare: {
						normal: {
							square: {
								color: '#86BCFF',
								radius: 10,
							},
						},
						hover: {
							square: {
								color: '#86BCFF',
								radius: 15,
							},
						},
						selected: {
							square: {
								color: '#54A0FF',
								radius: 10,
							},
						},
						disabled: {
							square: {
								color: '#707070',
								radius: 10,
							},
						},
						disabledSelected: {
							square: {
								color: '#505050',
								radius: 10,
							},
						},
					},
					sellSquare: {
						normal: {
							square: {
								color: '#F38586',
								radius: 10,
							},
						},
						hover: {
							square: {
								color: '#F38586',
								radius: 15,
							},
						},
						selected: {
							square: {
								color: '#EE5152',
								radius: 10,
							},
						},
						disabled: {
							square: {
								color: '#707070',
								radius: 10,
							},
						},
						disabledSelected: {
							square: {
								color: '#505050',
								radius: 10,
							},
						},
					},
					rentBig: {
						normal: {
							circle: {
								color: '#86BCFF',
								radius: 15,
							},
						},
						hover: {
							circle: {
								color: '#86BCFF',
								radius: 22.5,
							},
						},
						selected: {
							circle: {
								color: '#54A0FF',
								radius: 15,
							},
						},
						disabled: {
							circle: {
								color: '#707070',
								radius: 15,
							},
						},
						disabledSelected: {
							circle: {
								color: '#505050',
								radius: 15,
							},
						},
					},
					sellBig: {
						normal: {
							circle: {
								color: '#F38586',
								radius: 15,
							},
						},
						hover: {
							circle: {
								color: '#F38586',
								radius: 22.5,
							},
						},
						selected: {
							circle: {
								color: '#EE5152',
								radius: 15,
							},
						},
						disabled: {
							circle: {
								color: '#707070',
								radius: 15,
							},
						},
						disabledSelected: {
							circle: {
								color: '#505050',
								radius: 15,
							},
						},
					},
					rentSquareBig: {
						normal: {
							square: {
								color: '#86BCFF',
								radius: 18.75,
							},
						},
						hover: {
							square: {
								color: '#86BCFF',
								radius: 28.125,
							},
						},
						selected: {
							square: {
								color: '#54A0FF',
								radius: 18.75,
							},
						},
						disabled: {
							square: {
								color: '#707070',
								radius: 18.75,
							},
						},
						disabledSelected: {
							square: {
								color: '#505050',
								radius: 18.75,
							},
						},
					},
					sellSquareBig: {
						normal: {
							square: {
								color: '#F38586',
								radius: 18.75,
							},
						},
						hover: {
							square: {
								color: '#F38586',
								radius: 28.125,
							},
						},
						selected: {
							square: {
								color: '#EE5152',
								radius: 18.75,
							},
						},
						disabled: {
							square: {
								color: '#707070',
								radius: 18.75,
							},
						},
						disabledSelected: {
							square: {
								color: '#505050',
								radius: 18.75,
							},
						},
					},
					rentStatisticsPoint: {
						normal: {
							circle: {
								color: '#86BCFF',
								strokeColor: 'rgba(134, 188, 255, 0.5)',
								strokeWidth: 10,
							},
						},
					},
					sellStatisticsPoint: {
						normal: {
							circle: {
								color: '#F38586',
								strokeColor: 'rgba(243, 133, 134, 0.5)',
								strokeWidth: 10,
							},
						},
					},
					userPoint: {
						// normal: {
						// 	icon: {
						// 		src: require('./assets/point.svg'),
						// 		scale: 0.1,
						// 	},
						// },
					},
				},
				polygon: {
					solidGray: {
						normal: {
							strokeColor: '#ccc',
							strokeWidth: 5,
							fillColor: '#ccc',
						},
					},
					secondary: {
						normal: {
							color: '#FFD600',
						},
					},
					accent: {
						normal: {
							color: '#82B1FF',
						},
					},
					lightGray: {
						normal: {
							fillColor: 'rgba(0, 0, 0, 0.08)',
							strokeColor: '#bbb',
						},
					},
					test: {
						normal: {
							color: 'green',
							fillColor: 'orange',
							strokeColor: 'transparent',
						},
					},
				},
			},
		};
	},
};
