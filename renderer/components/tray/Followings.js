import electron from 'electron'
import React from 'react'
import { Subscribe } from 'unstated'
import { ConnectHOC, query, mutation } from 'urql'

// Utilities
import gql from '../../utils/graphql/gql'
import groupKeys from '../../utils/keys/groupKeys'
import { isOnline } from '../../utils/online'
import { sortKeys } from './SortModeContainer'
import { Person, Place } from '../../utils/graphql/fragments'
import { openAddWindow } from '../../utils/windows/helpers'
import { getDisplayFormat, setDisplayFormat } from '../../utils/store'

// Local
import SortModeContainer from './SortModeContainer'
import FollowingsWrapper from './FollowingsWrapper'
import FollowingsList from './FollowingsList'
import AddFirstOne from '../AddFirstOne'
import Loading from './Loading'
import Group from './Group'

class Followings extends React.Component {
  render() {
    const { loaded, data } = this.props

    if (!loaded) {
      return <Loading />
    }

    // Call these after `loaded` check to ensure
    // we have values
    const hasPeople = this.hasPeople()
    const hasPlaces = this.hasPlaces()
    const isOnlyUserItself = this.isOnlyUserItself()
    const showAddFirst =
      (!hasPeople && !hasPlaces) || (isOnlyUserItself && !hasPlaces)

    return (
      <FollowingsWrapper>
        {hasPeople && (
          <Group>
            <FollowingsList
              user={data.user}
              sortKey={sortKeys.People}
              followingsList={data.followingList.people}
            />
          </Group>
        )}
        {hasPlaces && (
          <Group title={hasPeople && 'Places'} groupKey={groupKeys.Places}>
            <FollowingsList
              user={data.user}
              sortKey={sortKeys.Places}
              followingsList={data.followingList.places}
            />
          </Group>
        )}
        {showAddFirst && <AddFirstOne onAddClick={openAddWindow} />}
      </FollowingsWrapper>
    )
  }

  componentWillReceiveProps(newProps) {
    if (
      this.props.fetching !== newProps.fetching &&
      newProps.fetching === false
    ) {
      this.props.sortMode.followingsFetched()
    }
  }

  shouldComponentUpdate(newProps) {
    if (newProps.fetching === true) {
      return false
    }

    return true
  }

  hasPlaces = () => {
    return (
      this.props.data &&
      this.props.data.followingList.places &&
      this.props.data.followingList.places.length > 0
    )
  }

  hasPeople = () => {
    return (
      this.props.data &&
      this.props.data.followingList.people &&
      this.props.data.followingList.people.length > 0
    )
  }

  isOnlyUserItself = () => {
    const { data } = this.props

    if (!data) {
      return
    }

    return (
      data.followingList.people.length === 1 &&
      data.followingList.people[0].id === data.user.id
    )
  }

  componentDidMount() {
    const ipc = electron.ipcRenderer || false

    if (!ipc) {
      return
    }

    // Listen to display format checkbox
    if (ipc.listenerCount('toggle-format') === 0) {
      ipc.on('toggle-format', this.formatChanged)
    }
  }

  componentWillUnmount() {
    const ipc = electron.ipcRenderer || false

    if (!ipc) {
      return
    }

    ipc.removeListener('toggle-format', this.formatChanged)
  }

  formatChanged = async () => {
    const oldFormat = getDisplayFormat()
    const newFormat = oldFormat === '24h' ? '12h' : '24h'

    // Update it for user
    await this.props.updateDisplayFormat({ newDisplayFormat: newFormat })

    // Update the store on success to change the option in
    // preferences context menu
    setDisplayFormat(newFormat)
    this.forceUpdate()
  }
}

const FollowingList = query(gql`
  query {
    followingList {
      people {
        ...Person
      }
      places {
        ...Place
      }
    }
    user {
      id
      city
      timezone
    }
  }
  ${Person}
  ${Place}
`)

const UpdateDisplayFormat = mutation(gql`
  mutation($newDisplayFormat: String) {
    updateUser(displayFormat: $newDisplayFormat) {
      id
      displayFormat
    }
  }
`)

const EnhancedFollowing = ConnectHOC({
  query: FollowingList,
  mutation: {
    updateDisplayFormat: UpdateDisplayFormat,
  },
  cache: !isOnline(),
  shouldInvalidate(changedTypenames) {
    const relatedTypenames = ['User', 'ManualPlace', 'ManualPerson', 'Refresh']
    const allTypenames = new Set(relatedTypenames.concat(changedTypenames))
    if (
      allTypenames.size !==
      relatedTypenames.length + changedTypenames.length
    ) {
      return true
    }
  },
})(Followings)

const FollowingsWithSortMode = props => (
  <Subscribe
    to={[SortModeContainer]}
    children={sortMode => <EnhancedFollowing {...props} sortMode={sortMode} />}
  />
)

export default FollowingsWithSortMode
