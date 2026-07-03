import { useLayoutEffect } from 'react';
import { topNavStore } from '@/store/topNavStore';
import { useIsPresent } from 'framer-motion';

export default function TopNavConfig(props) {
    const isPresent = useIsPresent();

    // We use useLayoutEffect without a dependency array so it runs after EVERY render.
    // This ensures that if the page passes dynamic props (like state variables or inline arrow functions),
    // the TopNav will always be updated with the latest references.
    useLayoutEffect(() => {
        if (!isPresent) return; // Mencegah komponen yang sedang animasi keluar (exit) menimpa state Navbar baru

        topNavStore.setState({
            leftNode: props.leftNode || null,
            titleNode: props.titleNode || null,
            rightNode: props.rightNode || null,
            extraNode: props.extraNode || null,
            className: props.className || '',
            hide: props.hide || false,
        });
    });

    return null;
}
