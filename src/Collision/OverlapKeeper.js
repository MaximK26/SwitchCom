export class OverlapKeeper {
	constructor() {
		this.current = [];
		this.previous = [];
	}
	getKey(i, j) {
		if (j < i) {
			var temp = j;
			j = i;
			i = temp;
		}
		return (i << 16) | j;
	}
	set(i, j) {
		// Insertion sort. This way the diff will have linear complexity.
		var key = this.getKey(i, j);
		var current = this.current;
		var index = 0;
		while(key > current[index]) { index++; }
		if(key === current[index]) return;
		for(var j=current.length-1; j>=index; j--) current[j + 1] = current[j];
		current[index] = key;
	}
	tick() {
		var tmp = this.current;
		this.current = this.previous;
		this.previous = tmp;
		this.current.length = 0;
	}
	getDiff(additions, removals) {
		
		function unpackAndPush(array, key) { array.push((key & 0xFFFF0000) >> 16, key & 0x0000FFFF); }
		
		var a = this.current;
		var b = this.previous;
		var al = a.length;
		var bl = b.length;

		var j=0;
		for (var i = 0; i < al; i++) {
			var found = false;
			var keyA = a[i];
			while(keyA > b[j]){ j++; }
			found = keyA === b[j];
			if(!found) unpackAndPush(additions, keyA);
		}
		j = 0;
		for (var i = 0; i < bl; i++) {
			var found = false;
			var keyB = b[i];
			while(keyB > a[j]){ j++; }
			found = a[j] === keyB;
			if(!found) unpackAndPush(removals, keyB);
		}
	}
}