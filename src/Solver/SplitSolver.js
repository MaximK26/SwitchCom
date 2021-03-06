import * as THREE	from 'three';
import { Solver }	from './Solver';
import { Body }		from '../Objects/Body';

export class SplitSolver extends Solver {
	constructor(subsolver) {
		super();
		this.iterations = 10;
		this.tolerance = 1e-7;
		this.subsolver = subsolver;
		this.nodes = [];
		this.nodePool = [];
		// Create needed nodes, reuse if possible
		while(this.nodePool.length < 128) { this.nodePool.push(this.createNode()); }
	}
	createNode() { return { body:null, children:[], eqs:[], visited:false } };
	solve(dt, world) {
		var nodes = [],
			nodePool=this.nodePool,
			bodies=world.bodies,
			equations=this.equations,
			Neq=equations.length,
			Nbodies=bodies.length,
			subsolver=this.subsolver;

		// Create needed nodes, reuse if possible
		while(nodePool.length < Nbodies){
			nodePool.push(this.createNode());
		}
		nodes.length = Nbodies;
		for (var i = 0; i < Nbodies; i++) {
			nodes[i] = nodePool[i];
		}

		// Reset node values
		for(var i=0; i!==Nbodies; i++){
			var node = nodes[i];
			node.body = bodies[i];
			node.children.length = 0;
			node.eqs.length = 0;
			node.visited = false;
		}
		for(var k=0; k!==Neq; k++){
			var eq=equations[k],
				i=bodies.indexOf(eq.bi),
				j=bodies.indexOf(eq.bj),
				ni=nodes[i],
				nj=nodes[j];
			ni.children.push(nj);
			ni.eqs.push(eq);
			nj.children.push(ni);
			nj.eqs.push(eq);
		}

		var child, n=0, eqs = [];

		subsolver.tolerance = this.tolerance;
		subsolver.iterations = this.iterations;

		var dummyWorld = {bodies:[]};
		while((child = getUnvisitedNode(nodes))){
			eqs.length = 0;
			dummyWorld.bodies.length = 0;
			bfs(child, visitFunc, dummyWorld.bodies, eqs);

			var Neqs = eqs.length;

			eqs = eqs.sort(sortById);

			for(var i=0; i!==Neqs; i++){
				subsolver.addEquation(eqs[i]);
			}

			var iter = subsolver.solve(dt,dummyWorld);
			subsolver.removeAllEquations();
			n++;
		}
		return n;
	}
}

function sortById(a, b) { return b.id - a.id }

function getUnvisitedNode(nodes) {
	var Nnodes = nodes.length;
	for(var i=0; i!==Nnodes; i++){
		var node = nodes[i];
		if(!node.visited && !(node.body.type & Body.STATIC)){
			return node;
		}
	}
	return false;
}

function bfs(root,visitFunc,bds,eqs) {
	var queue = [];
	queue.push(root);
	root.visited = true;
	visitFunc(root,bds,eqs);
	while(queue.length) {
		var node = queue.pop();
		// Loop over unvisited child nodes
		var child;
		while((child = getUnvisitedNode(node.children))) {
			child.visited = true;
			visitFunc(child,bds,eqs);
			queue.push(child);
		}
	}
}

function visitFunc(node,bds,eqs) {
	bds.push(node.body);
	var Neqs = node.eqs.length;
	for(var i=0; i!==Neqs; i++){
		var eq = node.eqs[i];
		if(eqs.indexOf(eq) === -1){
			eqs.push(eq);
		}
	}
}
