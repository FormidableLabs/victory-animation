/*global requestAnimationFrame, cancelAnimationFrame, setTimeout*/

import React from "react";
import d3 from "d3";
import { timer } from "d3-timer";
import { addVictoryInterpolator } from "../util";

addVictoryInterpolator();
const VELOCITY_MULTIPLIER = 16.5;

export default class VictoryAnimation extends React.Component {
  static propTypes = {
    children: React.PropTypes.func,
    velocity: React.PropTypes.number,
    easing: React.PropTypes.string,
    delay: React.PropTypes.number,
    onEnd: React.PropTypes.func,
    data: React.PropTypes.oneOfType([
      React.PropTypes.object,
      React.PropTypes.array
    ])
  };

  static defaultProps = {
    /* velocity modifies step each frame */
    velocity: 0.02,
    /* easing modifies step each frame */
    easing: "quad-in-out",
    /* delay between transitions */
    delay: 0,
    /* we got nothin' */
    data: {}
  };

  constructor(props) {
    super(props);
    /* defaults */
    this.state = Array.isArray(this.props.data)
      ? this.props.data[0] : this.props.data;
    this.interpolator = null;
    this.queue = [];
    /* build easing function */
    this.ease = d3.ease(this.props.easing);
    /*
      unlike React.createClass({}), there is no autobinding of this in ES6 classes
      so we bind functionToBeRunEachFrame to current instance of victory animation class
    */
    this.functionToBeRunEachFrame = this.functionToBeRunEachFrame.bind(this);
  }
  /* lifecycle */
  componentWillReceiveProps(nextProps) {
    /* cancel existing timer if it exists */
    if (this.timer) {
      this.timer.stop();
    }
    /* If an object was supplied */

    if (Array.isArray(nextProps.data) === false) {
      /* compare cached version to next props */
      this.interpolator = d3.interpolate(this.state, nextProps.data);
      this.timer = timer(this.functionToBeRunEachFrame, this.props.delay);
    /* If an array was supplied */
    } else {
      /* Build our tween queue */
      nextProps.data.forEach((data) => {
        this.queue.push(data);
      });
      /* Start traversing the tween queue */
      this.timer = timer(this.traverseQueue);
    }
  }
  componentWillUnmount() {
    if (this.timer) {
      this.timer.stop()
    }
  }
  /* Traverse the tween queue - called withing d3-timer*/
  traverseQueue() {
    if (this.queue.length > 0) {
      /* Get the next index */
      const data = this.queue[0];
      /* compare cached version to next props */
      this.interpolator = d3.interpolate(this.state, data);
      timer(this.functionToBeRunEachFrame, this.props.delay)
    } else if (this.props.onEnd) {
      this.props.onEnd();
    }
  }
  /* every frame we... */
  functionToBeRunEachFrame(elapsed) {
    /*
      step can generate imprecise values, sometimes greater than 1
      if this happens set the state to 1 and return, cancelling the timer
    */
    const step = elapsed / (VELOCITY_MULTIPLIER / this.props.velocity);

    if (step >= 1) {
      this.setState(this.interpolator(1));
      this.timer.stop()

      if (this.props.onEnd) {
        this.props.onEnd();
      }
      return;
    }
    /*
      if we're not at the end of the timer, set the state by passing
      current step value that's transformed by the ease function to the
      interpolator, which is cached for performance whenever props are received
    */
    this.setState(this.interpolator(this.ease(step)));
  }
  render() {
    return this.props.children(this.state);
  }
}
