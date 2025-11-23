import {
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonBadge,
  IonSearchbar
} from '@ionic/react';
import { people, globe } from 'ionicons/icons';
import { motion } from 'framer-motion';

function Search({
  searchMode,
  handleSearchModeChange,
  channels,
  allChannels,
  searchQuery,
  handleSearch,
  clearSearch,
  searchLoading
}) {
  const loadingVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <>
      <div style={{ padding: '16px', paddingBottom: '8px' }}>
        <IonSegment 
          value={searchMode} 
          onIonChange={e => handleSearchModeChange(e.detail.value)}
          style={{
            '--background': 'var(--ion-color-light)',
            '--background-checked': '#2d004d'
          }}
        >
          <IonSegmentButton value="my">
            <IonIcon icon={people} />
            <IonLabel style={{ marginLeft: '8px' }}>My Channels</IonLabel>
            <IonBadge color="medium" style={{ marginLeft: '8px' }}>
              {channels.length}
            </IonBadge>
          </IonSegmentButton>
          <IonSegmentButton value="global">
            <IonIcon icon={globe} />
            <IonLabel style={{ marginLeft: '8px' }}>All Channels</IonLabel>
            <IonBadge color="medium" style={{ marginLeft: '8px' }}>
              {allChannels.length}
            </IonBadge>
          </IonSegmentButton>
        </IonSegment>
      </div>

      <div style={{ padding: '16px', paddingTop: '8px' }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <IonSearchbar
            value={searchQuery}
            onIonInput={handleSearch}
            onIonClear={clearSearch}
            placeholder={`Search ${searchMode === 'my' ? 'my' : 'all'} channels...`}
            style={{
              '--border-radius': '12px',
              '--box-shadow': '0 2px 8px rgba(45, 0, 77, 0.1)'
            }}
          />
        </motion.div>
      </div>

      {searchLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ 
            textAlign: 'center', 
            padding: '20px',
            color: 'var(--ion-color-medium)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <motion.div
              style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2d004d' }}
              variants={loadingVariants}
              animate="animate"
            />
            <motion.div
              style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2d004d' }}
              variants={loadingVariants}
              animate="animate"
              transition={{ delay: 0.2 }}
            />
            <motion.div
              style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2d004d' }}
              variants={loadingVariants}
              animate="animate"
              transition={{ delay: 0.4 }}
            />
          </div>
          <p>Searching channels...</p>
        </motion.div>
      )}
    </>
  );
}

export default Search;
