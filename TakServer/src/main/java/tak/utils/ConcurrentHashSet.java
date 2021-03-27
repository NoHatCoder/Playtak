/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package tak.utils;

import java.util.Collection;
import java.util.Collections;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 *
 * @author chaitu
 */
public class ConcurrentHashSet<T> extends ConcurrentHashMap<T, Boolean> implements Iterable<T> {
	private Set<T> set;
	
	public ConcurrentHashSet () {
		super();
		set = Collections.newSetFromMap(this);
	}
	
	@Override
	public boolean contains(Object o) {
		return this.containsKey(o);
	}
	
	public boolean add(T o){
		return this.put(o,true)==null;
	}
	public Iterator<T> iterator() {
		//Set<T> set = Collections.newSetFromMap(this);
		return set.iterator();
	}
}
/*
public class ConcurrentHashSet<T> implements Set<T> {

    Map<T, Boolean> map = new ConcurrentHashMap();
    Set<T> set = Collections.newSetFromMap(map);
    
    @Override
    public int size() {
        return set.size();
    }

    @Override
    public boolean isEmpty() {
        return set.isEmpty();
    }

    @Override
    public boolean contains(Object o) {
        return set.contains(o);
    }

    @Override
    public Iterator<T> iterator() {
        return set.iterator();
    }

    @Override
    public T[] toArray() {
        return set.toArray();
    }

    @Override
    public T[] toArray(T[] a) {
        return set.toArray(a);
    }

    @Override
    public boolean add(T e) {
        return set.add(e);
    }

    @Override
    public boolean remove(Object o) {
        return set.remove(o);
    }

    @Override
    public boolean containsAll(Collection c) {
        return set.containsAll(c);
    }

    @Override
    public boolean addAll(Collection c) {
        return set.addAll(c);
    }

    @Override
    public boolean retainAll(Collection c) {
        return set.retainAll(c);
    }

    @Override
    public boolean removeAll(Collection c) {
        return set.removeAll(c);
    }

    @Override
    public void clear() {
        set.clear();
    }
    
}
*/
